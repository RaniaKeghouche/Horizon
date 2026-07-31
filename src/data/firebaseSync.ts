// Real-time sync with Supabase: fetch every table into the Zustand store, then keep it
// live via Realtime. Changes are applied INCREMENTALLY (insert/update/delete the single
// affected row) rather than refetching the whole table — this avoids clobbering optimistic
// local edits and is more efficient. Table names == COLLECTIONS values == store keys.
import type { RealtimeChannel } from "@supabase/supabase-js"; // type-only: erased at build
import { DEMO_MODE } from "../lib/config";
import { COLLECTIONS } from "../lib/types";
import { useData } from "./store";

type Row = { id: string } & Record<string, unknown>;

function applyChange(table: string, eventType: string, newRow: Row | null, oldRow: Row | null) {
  const state = useData.getState() as unknown as Record<string, Row[]>;
  const arr = state[table] ?? [];
  let next: Row[];
  if (eventType === "DELETE") {
    const id = oldRow?.id;
    next = arr.filter((r) => r.id !== id);
  } else if (newRow) {
    next = arr.some((r) => r.id === newRow.id)
      ? arr.map((r) => (r.id === newRow.id ? newRow : r))
      : [...arr, newRow];
  } else {
    return;
  }
  (useData.setState as (p: Record<string, unknown>) => void)({ [table]: next });
}

const setState = useData.setState as (p: Record<string, unknown>) => void;

/** Publicly-readable catalogue (subjects/classes/teachers) so the registration screen has
 *  its dropdowns even before the user is authenticated. Requires public read RLS on these. */
export async function fetchPublicCatalog(): Promise<void> {
  if (DEMO_MODE) return;
  const { supabase } = await import("../lib/supabase");
  for (const table of ["subjects", "classes", "teachers"]) {
    const { data, error } = await supabase.from(table).select("*");
    if (!error && data) setState({ [table]: data });
  }
}

let channel: RealtimeChannel | null = null;
let started = false;

export async function startSync(): Promise<void> {
  if (DEMO_MODE || started) return;
  started = true;
  const { supabase } = await import("../lib/supabase");
  const tables = Object.values(COLLECTIONS);

  // Initial full load.
  await Promise.all(
    tables.map(async (table) => {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        console.warn(`sync ${table}:`, error.message);
        return;
      }
      if (data) (useData.setState as (p: Record<string, unknown>) => void)({ [table]: data });
    })
  );

  // Live incremental updates.
  channel = supabase.channel("horizon-all");
  for (const table of tables) {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      (payload) => applyChange(table, payload.eventType, payload.new as Row, payload.old as Row)
    );
  }
  channel.subscribe();
}

export function stopSync(): void {
  started = false;
  if (channel) {
    channel.unsubscribe();
    channel = null;
  }
}

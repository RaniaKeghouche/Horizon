// Real-time sync with Supabase: fetch every table into the Zustand store, then keep it
// live via Realtime. Changes are applied INCREMENTALLY (insert/update/delete the single
// affected row) rather than refetching the whole table — this avoids clobbering optimistic
// local edits and is more efficient. Table names == COLLECTIONS values == store keys.
import type { RealtimeChannel } from "@supabase/supabase-js"; // type-only: erased at build
import { DEMO_MODE } from "../lib/config";
import { COLLECTIONS } from "../lib/types";
import { useData } from "./store";
import { clearSyncIssues, reportMissingTable } from "./syncStatus";

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

/** Publicly-readable catalogue so the registration screen has its dropdowns before the
 *  user is authenticated. Only `subjects` is fetched: RegisterFlow's sole pre-login
 *  dropdown is the teacher subject picker, and anon read on classes/teachers was dropped
 *  in supabase/rls-hardening.sql — the teachers table carries pay terms. */
export async function fetchPublicCatalog(): Promise<void> {
  if (DEMO_MODE) return;
  const { supabase } = await import("../lib/supabase");
  const { data, error } = await supabase.from("subjects").select("*");
  if (!error && data) setState({ subjects: data });
}

let channel: RealtimeChannel | null = null;
let started = false;

export async function startSync(): Promise<void> {
  if (DEMO_MODE || started) return;
  started = true;
  const { supabase } = await import("../lib/supabase");
  const tables = Object.values(COLLECTIONS);

  // Initial full load. Record which tables actually answered: a table that is
  // missing (migration not run) or blocked by RLS must NOT be subscribed to
  // below, because one bad entry makes Realtime reject the whole channel — which
  // silently kills live updates for every other table too.
  const live: string[] = [];
  const missing: { table: string; reason: string }[] = [];

  await Promise.all(
    tables.map(async (table) => {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        missing.push({ table, reason: error.message });
        return;
      }
      live.push(table);
      if (data) setState({ [table]: data });
    })
  );

  if (missing.length > 0) {
    console.warn(
      `[sync] ${missing.length} table(s) unavailable — skipped, and NOT subscribed to realtime:\n` +
        missing.map((m) => `  • ${m.table}: ${m.reason}`).join("\n") +
        `\nIf these are new tables, run supabase/SETUP.sql.`
    );
    // Also tell the user, not just the console — an empty page must explain itself.
    for (const m of missing) reportMissingTable(m.table, m.reason);
  }

  // Live incremental updates, only for tables that exist.
  channel = supabase.channel("horizon-all");
  for (const table of live) {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      (payload) => applyChange(table, payload.eventType, payload.new as Row, payload.old as Row)
    );
  }
  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      console.info(`[sync] realtime live on ${live.length} table(s)`);
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      // Realtime is an enhancement; the initial load already populated the store.
      console.warn(
        `[sync] realtime ${status}. Data loaded once, but live updates are off. ` +
          `Check that Realtime is enabled for these tables in Supabase.`
      );
    }
  });
}

/** Re-run the initial load. Useful after running a migration, or when rows were
 *  changed directly in the Supabase dashboard while realtime was down. */
export async function refetchAll(): Promise<void> {
  if (DEMO_MODE) return;
  const { supabase } = await import("../lib/supabase");
  // Re-derive the issue list from scratch: after a migration the old warnings
  // must disappear on their own.
  clearSyncIssues();
  await Promise.all(
    Object.values(COLLECTIONS).map(async (table) => {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        reportMissingTable(table, error.message);
        return;
      }
      if (data) setState({ [table]: data });
    })
  );
}

export function stopSync(): void {
  started = false;
  if (channel) {
    channel.unsubscribe();
    channel = null;
  }
}

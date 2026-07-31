// Real-time sync with Supabase: fetch every table into the Zustand store, then keep it
// live via Realtime (on any change to a table, refetch it). Components read from useData
// unchanged. Table names == COLLECTIONS values == store keys.
import type { RealtimeChannel } from "@supabase/supabase-js"; // type-only: erased at build
import { DEMO_MODE } from "../lib/config";
import { COLLECTIONS } from "../lib/types";
import { useData } from "./store";

const setCollection = useData.setState as (patch: Record<string, unknown>) => void;

let channel: RealtimeChannel | null = null;
let started = false;

export async function startSync(): Promise<void> {
  if (DEMO_MODE || started) return;
  started = true;
  const { supabase } = await import("../lib/supabase");
  const tables = Object.values(COLLECTIONS);

  async function refetch(table: string) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      console.warn(`sync ${table}:`, error.message);
      return;
    }
    if (data) setCollection({ [table]: data });
  }

  // Initial load.
  await Promise.all(tables.map(refetch));

  // Live updates.
  channel = supabase.channel("horizon-all");
  for (const table of tables) {
    channel.on("postgres_changes", { event: "*", schema: "public", table }, () => refetch(table));
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

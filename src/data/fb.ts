// Write helpers used by the store's actions. No-ops in DEMO_MODE (local store only).
// In Supabase mode they persist to Postgres; the realtime sync reflects changes back.
// Table names == COLLECTIONS values == store keys. Supabase is imported dynamically so
// DEMO_MODE never instantiates the client.
import { DEMO_MODE } from "../lib/config";

async function client() {
  const { supabase } = await import("../lib/supabase");
  return supabase;
}

/** Create or replace a row (upsert on primary key id). */
export function fbWrite<T extends { id: string }>(table: string, row: T): void {
  if (DEMO_MODE) return;
  void (async () => {
    try {
      const sb = await client();
      const { error } = await sb.from(table).upsert(row as Record<string, unknown>);
      if (error) throw error;
    } catch (e) {
      console.error(`write ${table}`, e);
    }
  })();
}

/** Patch fields of an existing row. */
export function fbPatch(table: string, id: string, patch: Record<string, unknown>): void {
  if (DEMO_MODE) return;
  void (async () => {
    try {
      const sb = await client();
      const { error } = await sb.from(table).update(patch).eq("id", id);
      if (error) throw error;
    } catch (e) {
      console.error(`patch ${table}/${id}`, e);
    }
  })();
}

/** Delete a row. */
export function fbDelete(table: string, id: string): void {
  if (DEMO_MODE) return;
  void (async () => {
    try {
      const sb = await client();
      const { error } = await sb.from(table).delete().eq("id", id);
      if (error) throw error;
    } catch (e) {
      console.error(`delete ${table}/${id}`, e);
    }
  })();
}

/** Upsert many rows at once (used for seeding). */
export function fbWriteMany<T extends { id: string }>(table: string, rows: T[]): void {
  if (DEMO_MODE || rows.length === 0) return;
  void (async () => {
    try {
      const sb = await client();
      const { error } = await sb.from(table).upsert(rows as Record<string, unknown>[]);
      if (error) throw error;
    } catch (e) {
      console.error(`writeMany ${table}`, e);
    }
  })();
}

// Write helpers used by the store's actions. No-ops in DEMO_MODE (local store only).
// In Supabase mode every write goes through the offline outbox, which persists it and
// syncs to Supabase (immediately if online, or on reconnect). Same signatures as before,
// so the store and components don't change. Table names == COLLECTIONS values == store keys.
import { DEMO_MODE } from "../lib/config";
import { enqueue } from "./outbox";

/** Create or replace a row (upsert on primary key id). */
export function fbWrite<T extends { id: string }>(table: string, row: T): void {
  if (DEMO_MODE) return;
  enqueue({ k: "upsert", table, row: row as Record<string, unknown> });
}

/** Patch fields of an existing row. */
export function fbPatch(table: string, id: string, patch: Record<string, unknown>): void {
  if (DEMO_MODE) return;
  enqueue({ k: "update", table, id, patch });
}

/** Delete a row. */
export function fbDelete(table: string, id: string): void {
  if (DEMO_MODE) return;
  enqueue({ k: "delete", table, id });
}

/** Upsert many rows at once (used for seeding). */
export function fbWriteMany<T extends { id: string }>(table: string, rows: T[]): void {
  if (DEMO_MODE) return;
  for (const row of rows) enqueue({ k: "upsert", table, row: row as Record<string, unknown> });
}

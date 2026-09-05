// Offline outbox: durable local queue of writes. Every change is enqueued and persisted
// to localStorage, then flushed to Supabase. If offline (or a request fails on the network)
// the queue is kept and retried automatically when the connection returns. This is what
// makes the app work offline and re-sync on reconnect (Supabase has no built-in offline).
import { DEMO_MODE } from "../lib/config";
import { reportDroppedColumn, reportRejectedWrite } from "./syncStatus";

type Op =
  | { k: "upsert"; table: string; row: Record<string, unknown> }
  | { k: "update"; table: string; id: string; patch: Record<string, unknown> }
  | { k: "delete"; table: string; id: string };

const KEY = "horizon-outbox";
let queue: Op[] = [];
let flushing = false;
let initialised = false;

function load() {
  try {
    queue = JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    queue = [];
  }
}
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(queue));
  } catch {
    /* storage full — ignore */
  }
}

/** Number of changes waiting to be synced (for an optional UI indicator). */
export function pendingCount(): number {
  return queue.length;
}

/**
 * Retire de la file les ecritures en attente qui visent une ligne donnee.
 *
 * Sert quand une action locale a mis en file des ecritures que la base
 * refusera de toute facon, parce qu'une fonction en base va faire le travail a
 * leur place (voir selfEnroll et supabase/self-service.sql). Les laisser
 * partir ne produirait que des refus dans le bandeau de synchro.
 */
export function dropQueued(table: string, id: string): void {
  if (DEMO_MODE) return;
  const before = queue.length;
  queue = queue.filter((op) => {
    if (op.table !== table) return true;
    const opId = op.k === "upsert" ? (op.row.id as string) : op.id;
    return opId !== id;
  });
  if (queue.length !== before) persist();
}

export function enqueue(op: Op): void {
  if (DEMO_MODE) return;
  queue.push(op);
  persist();
  void flush();
}

/** PostgREST for "this column does not exist":
 *  "Could not find the 'roomId' column of 'classes' in the schema cache" */
const UNKNOWN_COLUMN = /could not find the '([^']+)' column/i;

export async function flush(): Promise<void> {
  if (DEMO_MODE || flushing) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  if (queue.length === 0) return;
  flushing = true;
  try {
    const { supabase } = await import("../lib/supabase");
    const send = async (op: Op) => {
      if (op.k === "upsert") return (await supabase.from(op.table).upsert(op.row)).error;
      if (op.k === "update") return (await supabase.from(op.table).update(op.patch).eq("id", op.id)).error;
      return (await supabase.from(op.table).delete().eq("id", op.id)).error;
    };

    while (queue.length > 0) {
      const op = queue[0];
      try {
        let error = await send(op);

        // The database can be a migration behind the app. Rather than losing the
        // whole row over one unknown column, drop that column and retry — the
        // record still lands, minus the field the schema cannot hold yet. The
        // banner reports what was dropped so this is never silent.
        for (let guard = 0; error && guard < 12; guard++) {
          const col = error.message.match(UNKNOWN_COLUMN)?.[1];
          if (!col) break;
          const bag =
            op.k === "upsert" ? op.row : op.k === "update" ? op.patch : undefined;
          if (!bag || !(col in bag)) break;
          delete bag[col];
          persist(); // the trimmed op is what we retry, including after a reload
          reportDroppedColumn(op.table, col);
          error = await send(op);
        }

        if (error) {
          // Server rejected (RLS/validation) — drop this op so it doesn't block the queue.
          // Dropping it silently is what made a failed "load demo data" look like
          // nothing happened at all, so surface it to the UI as well.
          console.error("outbox rejected", op, error.message);
          reportRejectedWrite(op.table, error.message);
          queue.shift();
          persist();
          continue;
        }
        // Success.
        queue.shift();
        persist();
      } catch {
        // Network failure — stop and retry later (keep the queue).
        break;
      }
    }
  } finally {
    flushing = false;
  }
}

/** Start the outbox: load persisted queue, flush now, on reconnect, and periodically. */
export function initOutbox(): void {
  if (DEMO_MODE || initialised) return;
  initialised = true;
  load();
  if (typeof window !== "undefined") {
    window.addEventListener("online", () => void flush());
    setInterval(() => void flush(), 15000);
  }
  void flush();
}

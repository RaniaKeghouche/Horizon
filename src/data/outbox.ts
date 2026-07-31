// Offline outbox: durable local queue of writes. Every change is enqueued and persisted
// to localStorage, then flushed to Supabase. If offline (or a request fails on the network)
// the queue is kept and retried automatically when the connection returns. This is what
// makes the app work offline and re-sync on reconnect (Supabase has no built-in offline).
import { DEMO_MODE } from "../lib/config";

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

export function enqueue(op: Op): void {
  if (DEMO_MODE) return;
  queue.push(op);
  persist();
  void flush();
}

export async function flush(): Promise<void> {
  if (DEMO_MODE || flushing) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  if (queue.length === 0) return;
  flushing = true;
  try {
    const { supabase } = await import("../lib/supabase");
    while (queue.length > 0) {
      const op = queue[0];
      try {
        let error;
        if (op.k === "upsert") ({ error } = await supabase.from(op.table).upsert(op.row));
        else if (op.k === "update") ({ error } = await supabase.from(op.table).update(op.patch).eq("id", op.id));
        else ({ error } = await supabase.from(op.table).delete().eq("id", op.id));

        if (error) {
          // Server rejected (RLS/validation) — drop this op so it doesn't block the queue.
          console.error("outbox rejected", op, error.message);
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

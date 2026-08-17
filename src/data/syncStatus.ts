// Why the screen is empty, surfaced to the user instead of to the console.
//
// Two failure modes used to be invisible: a table the initial sync could not
// read (migration not run, or RLS), and a write the server rejected — the
// outbox drops those so the queue keeps moving, which meant "Load demo data"
// could fail completely and silently. Both are collected here and rendered by
// <SyncBanner/>, so an empty page always says what is wrong with it.
import { useSyncExternalStore } from "react";

export interface SyncIssue {
  kind: "table" | "write" | "column";
  table: string;
  reason: string;
}

let issues: SyncIssue[] = [];
const listeners = new Set<() => void>();

function emit() {
  // New array identity: useSyncExternalStore compares with Object.is.
  issues = [...issues];
  listeners.forEach((l) => l());
}

/** Deduplicate on the whole issue — a failing batch would otherwise report the
 *  same missing column once per row. */
function add(issue: SyncIssue) {
  if (issues.some((i) => i.kind === issue.kind && i.table === issue.table && i.reason === issue.reason))
    return;
  issues.push(issue);
  emit();
}

export function reportMissingTable(table: string, reason: string): void {
  add({ kind: "table", table, reason });
}

export function reportRejectedWrite(table: string, reason: string): void {
  add({ kind: "write", table, reason });
}

/** A row was saved, but without this column: the database does not have it yet. */
export function reportDroppedColumn(table: string, column: string): void {
  add({ kind: "column", table, reason: column });
}

/** Called before a fresh sync so stale issues don't linger after a migration. */
export function clearSyncIssues(): void {
  if (issues.length === 0) return;
  issues = [];
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const snapshot = () => issues;

export function useSyncIssues(): SyncIssue[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * PostgREST's vocabulary for "your database does not have this yet":
 *   PGRST205 / "Could not find the table"  → the table does not exist
 *   PGRST204 / "Could not find the 'x' column" → the column does not exist
 * Both mean a migration is pending, as opposed to a permission or network
 * problem, so the banner can give a precise instruction.
 */
export function isSchemaError(message: string): boolean {
  return /could not find the (table|'.*' column)/i.test(message) || /schema cache/i.test(message);
}

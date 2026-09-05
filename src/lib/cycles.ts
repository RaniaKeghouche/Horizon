// Billing cycles — the centre bills in blocks of sessions, not month by month.
//
// The rule, as the school states it:
//   • A session counts only if it is BILLABLE: the student was present, or was
//     absent but the absence is payante. An absence non payée does not advance
//     the cycle at all — it is as if the session never happened for that
//     student.
//   • Every 4 countable sessions form one cycle, priced from the group.
//   • A cycle is payable FROM ITS FIRST SESSION — the family pays up front for
//     the block of four, so the desk can take the money at session 1 rather
//     than waiting for the block to finish.
//   • Reaching session 5 while cycle 1 is unpaid does NOT replace the debt: the
//     new cycle stacks on top, and both stay due until they are paid.
//
// Pure and side-effect free, so the arithmetic can be tested without a UI or a
// database (see the note in CLAUDE.md about business rules living here).
import type { AttendanceState, Payment, Session } from "./types";
import { isBillable } from "./payments";
import { billingMonth } from "./format";

/** How many countable sessions make one payable cycle. */
export const SESSIONS_PER_CYCLE = 4;

export interface CycleSession {
  sessionId: string;
  date: number;
  /** 1-based index within the whole enrolment, counting billable sessions only. */
  number: number;
  state: AttendanceState;
}

export interface Cycle {
  /** 1-based cycle number: cycle 1 covers countable sessions 1-4. */
  index: number;
  sessions: CycleSession[];
  /** True once the cycle has all 4 sessions; a partial cycle is still running. */
  complete: boolean;
  amount: number;
  paid: boolean;
  /** When the last of its sessions was settled. */
  paidAt?: number;
  /** Which session of the enrolment the family actually paid at — the last
   *  session that had happened on or before the payment date. */
  paidAtSessionNumber?: number;
  /** Billing months this cycle spans, e.g. ["2026-08"] or ["2026-08","2026-09"]
   *  when the four sessions straddle the turn of a month. */
  months: string[];
  /** Owed as soon as the cycle has started and is not settled. */
  due: boolean;
  /** Date of the cycle's first session — when the money became payable. */
  dueSince: number;
}

/**
 * Split one student's sessions in one group into billing cycles.
 *
 * `payments` are the per-session ledger rows; a cycle counts as paid only when
 * every session in it is paid, which is what makes a partly-settled cycle still
 * show as owing.
 */
export function buildCycles(
  sessions: Session[],
  studentId: string,
  cyclePrice: number,
  payments: Payment[] = []
): Cycle[] {
  const paidBySession = new Map<string, Payment>();
  for (const p of payments) paidBySession.set(p.sessionId, p);

  // Only billable sessions advance the count, oldest first.
  const counted: CycleSession[] = sessions
    .filter((s) => {
      const state = s.attendance[studentId];
      return state !== undefined && isBillable(state);
    })
    .sort((a, b) => a.date - b.date)
    .map((s, i) => ({
      sessionId: s.id,
      date: s.date,
      number: i + 1,
      state: s.attendance[studentId],
    }));

  const cycles: Cycle[] = [];
  for (let i = 0; i < counted.length; i += SESSIONS_PER_CYCLE) {
    const slice = counted.slice(i, i + SESSIONS_PER_CYCLE);
    const complete = slice.length === SESSIONS_PER_CYCLE;
    const rows = slice.map((s) => paidBySession.get(s.sessionId));
    const paid = rows.length > 0 && rows.every((p) => p?.status === "paid");
    const paidAt = paid ? Math.max(...rows.map((p) => p?.paidAt ?? 0)) : undefined;

    // The session they were sitting in when they paid: the latest session that
    // had already taken place by the payment date.
    let paidAtSessionNumber: number | undefined;
    if (paidAt) {
      const upTo = counted.filter((x) => x.date <= paidAt);
      paidAtSessionNumber = upTo.length ? upTo[upTo.length - 1].number : slice[0].number;
    }

    cycles.push({
      index: cycles.length + 1,
      sessions: slice,
      complete,
      amount: cyclePrice,
      paid,
      paidAt: paidAt || undefined,
      paidAtSessionNumber,
      months: [...new Set(slice.map((x) => billingMonth(new Date(x.date))))],
      // Payable from session 1 of the block, so a cycle still in progress is
      // already owed. Waiting for `complete` would have hidden the debt until
      // the family had taken all four sessions.
      due: !paid,
      dueSince: slice[0].date,
    });
  }
  return cycles;
}

export interface CycleBalance {
  cycles: Cycle[];
  /** Started but not settled — this is the carry-forward debt. */
  unpaidCycles: Cycle[];
  /** Total owed right now: every started, unpaid cycle stacked together. */
  totalDue: number;
  /** Countable sessions done inside the cycle currently running. */
  progress: number;
  /** Sessions left before the running cycle becomes payable. */
  remaining: number;
  /** The cycle in progress, if any. */
  current?: Cycle;
  /** Billing months that still have an unpaid cycle, oldest first. */
  unpaidMonths: string[];
}

/** What the desk needs to know about one student at a glance. */
export function cycleBalance(
  sessions: Session[],
  studentId: string,
  cyclePrice: number,
  payments: Payment[] = []
): CycleBalance {
  const cycles = buildCycles(sessions, studentId, cyclePrice, payments);
  const unpaidCycles = cycles.filter((c) => c.due);
  const current = cycles.find((c) => !c.complete);
  const progress = current ? current.sessions.length : 0;

  return {
    cycles,
    unpaidCycles,
    totalDue: unpaidCycles.reduce((sum, c) => sum + c.amount, 0),
    progress,
    remaining: current ? SESSIONS_PER_CYCLE - progress : 0,
    current,
    unpaidMonths: [...new Set(unpaidCycles.flatMap((c) => c.months))].sort(),
  };
}

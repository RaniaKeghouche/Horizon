// Teacher payroll — who the school has already paid the teacher for, and who it
// still owes them for.
//
// A payout is a lump sum: "12 000 DA to Amine". It is never tagged with the
// students it covers. So to answer "which students have I already paid this
// teacher for?" the payouts are allocated across that teacher's earnings
// OLDEST FIRST, the way a running account is settled. The result is an
// attribution, not a stored fact — but it is a stable and defensible one, and
// it is what lets the ledger show a per-student settled/outstanding split.
//
// Pure and side-effect free, so the arithmetic is testable without a UI.
import type {
  Enrollment, Payment, Student, Subject, Teacher, TeacherPayoutRecord,
} from "./types";

export interface TeacherStudentLine {
  student: Student;
  subjectName: string;
  enrollmentId: string;
  /** Billable sessions this student has with this teacher. */
  sessions: number;
  /** Teacher's cut of what the student HAS paid — real, bankable earnings. */
  earned: number;
  /** Teacher's cut still locked behind the student's unpaid sessions. */
  pending: number;
  /** Part of `earned` the school has already handed over to the teacher. */
  settled: number;
  /** Part of `earned` the school still owes the teacher. */
  outstanding: number;
}

export interface TeacherLedger {
  teacher: Teacher;
  /** Everything the teacher has earned from students who paid. */
  earned: number;
  /** Locked behind students who have not paid yet. */
  pending: number;
  /** Already handed to the teacher. */
  paidOut: number;
  /** earned − paidOut: payable right now. */
  readyForPayout: number;
  /** earned + pending: the full liability if every student settles. */
  liability: number;
  sessions: number;
  lines: TeacherStudentLine[];
}

/**
 * Build one teacher's ledger.
 *
 * `payments` are the per-session rows; each carries the teacherCut for that
 * session, which is what makes the teacher's share per student rather than a
 * flat share of a group total.
 */
export function teacherLedger(
  teacher: Teacher,
  students: Student[],
  subjects: Subject[],
  enrollments: Enrollment[],
  payments: Payment[],
  payouts: TeacherPayoutRecord[]
): TeacherLedger {
  const mine = enrollments.filter((e) => e.teacherId === teacher.id);

  const lines: TeacherStudentLine[] = [];
  for (const enr of mine) {
    const student = students.find((s) => s.id === enr.studentId);
    if (!student) continue;
    const rows = payments.filter((p) => p.enrollmentId === enr.id);
    lines.push({
      student,
      subjectName: subjects.find((s) => s.id === enr.subjectId)?.name ?? "—",
      enrollmentId: enr.id,
      sessions: rows.length,
      earned: rows.filter((p) => p.status === "paid").reduce((s, p) => s + p.teacherCut, 0),
      pending: rows.filter((p) => p.status !== "paid").reduce((s, p) => s + p.teacherCut, 0),
      settled: 0,
      outstanding: 0,
    });
  }

  const earned = lines.reduce((s, l) => s + l.earned, 0);
  const pending = lines.reduce((s, l) => s + l.pending, 0);
  const paidOut = payouts
    .filter((p) => p.teacherId === teacher.id)
    .reduce((s, p) => s + p.amount, 0);

  // Allocate what has been paid out across the earning lines, oldest first.
  // A line is "settled" only once the running total reaches its earnings, so a
  // partial payout leaves exactly one line half-covered — which is the truth.
  let budget = paidOut;
  const ordered = [...lines].sort((a, b) => a.student.createdAt - b.student.createdAt);
  for (const line of ordered) {
    const take = Math.max(0, Math.min(budget, line.earned));
    line.settled = take;
    line.outstanding = line.earned - take;
    budget -= take;
  }

  return {
    teacher,
    earned,
    pending,
    paidOut,
    // Never negative: an over-payment is not a debt owed back through this screen.
    readyForPayout: Math.max(0, earned - paidOut),
    liability: earned + pending,
    sessions: lines.reduce((s, l) => s + l.sessions, 0),
    lines: lines.sort((a, b) => b.outstanding - a.outstanding || b.earned - a.earned),
  };
}

/** Totals across every teacher, for the cards at the top of the payroll page. */
export function payrollTotals(ledgers: TeacherLedger[]) {
  return {
    liability: ledgers.reduce((s, l) => s + l.liability, 0),
    ready: ledgers.reduce((s, l) => s + l.readyForPayout, 0),
    pending: ledgers.reduce((s, l) => s + l.pending, 0),
    paidOut: ledgers.reduce((s, l) => s + l.paidOut, 0),
  };
}

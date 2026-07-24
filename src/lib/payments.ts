// Pure payment logic — no Firebase, easy to unit test.
// Implements the school-cut rules from the Cahier des Charges §3.2.
import type { PaymentMode, AttendanceState, SessionType, StudentLevel } from "./types";

/** Default per-session prices in DA (cahier §3.1). Admin can override any of these. */
export const DEFAULT_PRICES: Partial<Record<`${SessionType}:${StudentLevel}`, number>> = {
  "group:middle": 2000,
  "group:high": 2700,
};

export function defaultPrice(sessionType: SessionType, level: StudentLevel): number | null {
  return DEFAULT_PRICES[`${sessionType}:${level}`] ?? null;
}

export interface CutResult {
  schoolCut: number;
  teacherCut: number;
}

/**
 * Split a session price between school and teacher.
 * - percentage mode: schoolCutValue is a percent (e.g. 25 -> school takes 25%)
 * - fixed mode: schoolCutValue is an exact DA amount (capped at the price)
 */
export function computeCut(price: number, mode: PaymentMode, schoolCutValue: number): CutResult {
  let schoolCut: number;
  if (mode === "percentage") {
    schoolCut = Math.round((price * schoolCutValue) / 100);
  } else {
    schoolCut = Math.min(schoolCutValue, price);
  }
  return { schoolCut, teacherCut: price - schoolCut };
}

/** Whether an attendance state should be billed (cahier §4.1). */
export function isBillable(state: AttendanceState): boolean {
  return state === "present" || state === "absent_paid";
}

export interface SubjectBilling {
  subjectId: string;
  pricePerSession: number;
  sessionsBilled: number;
  currentSession: number; // "session X of Y"
  totalSessions: number;
  total: number;
}

/** Total due across all a student's subjects (cahier §3.3). */
export function totalDue(subjects: SubjectBilling[]): number {
  return subjects.reduce((sum, s) => sum + s.total, 0);
}

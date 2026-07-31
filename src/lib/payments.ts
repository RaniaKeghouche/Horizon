// Pure payment logic — no Firebase, easy to unit test.
// Implements the school-cut rules from the Cahier des Charges §3.2.
import type { PaymentMode, AttendanceState, SessionType, StudentLevel } from "./types";

/** School cycle of a grade: primaire / moyen (CEM) / secondaire (lycée). */
export function levelCycle(level: StudentLevel): "primary" | "middle" | "high" {
  if (level.endsWith("am")) return "middle";
  if (level.endsWith("as")) return "high";
  return "primary";
}

/** Default per-session prices in DA by cycle (cahier §3.1). Admin can override any of these. */
export const DEFAULT_CYCLE_PRICES: Record<"primary" | "middle" | "high", number | null> = {
  primary: null, // fixé par l'admin
  middle: 2000, // Collège / CEM
  high: 2700, // Lycée
};

export function defaultPrice(sessionType: SessionType, level: StudentLevel): number | null {
  if (sessionType !== "group") return null; // 1-on-1 / spécial / été : prix fixé par l'admin
  return DEFAULT_CYCLE_PRICES[levelCycle(level)];
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

// Billing views computed from enrollments + sessions + payments.
// Pure functions over plain data so they work with the local store today and with
// Firestore data later, unchanged.
import type {
  Enrollment,
  Payment,
  Session,
  Student,
  Subject,
  Teacher,
  TeacherPayoutRecord,
} from "./types";

/** Assumed number of sessions in a monthly billing period (cahier examples: "3 of 4"). */
export const SESSIONS_PER_PERIOD = 4;

export interface SubjectBillingView {
  enrollmentId: string;
  subjectId: string;
  subjectName: string;
  teacherName: string;
  pricePerSession: number;
  currentSession: number; // "session X"
  totalSessions: number; // "of Y"
  amountDue: number; // unpaid billable amount
  amountPaid: number;
  unpaidPayments: Payment[];
  reminderCount: number; // total reminders sent for this subject
}

export interface StudentBilling {
  student: Student;
  subjects: SubjectBillingView[];
  totalDue: number;
  totalPaid: number;
}

interface Refs {
  subjects: Subject[];
  teachers: Teacher[];
}

function subjectName(subjects: Subject[], id: string): string {
  return subjects.find((s) => s.id === id)?.name ?? "—";
}
function teacherName(teachers: Teacher[], id: string): string {
  return teachers.find((t) => t.id === id)?.name ?? "—";
}

/** Full billing breakdown for one student across all their subjects (cahier §3.3, §3.4). */
export function computeStudentBilling(
  student: Student,
  enrollments: Enrollment[],
  sessions: Session[],
  payments: Payment[],
  refs: Refs
): StudentBilling {
  const myEnrollments = enrollments.filter((e) => e.studentId === student.id);

  const subjects: SubjectBillingView[] = myEnrollments.map((enr) => {
    const enrPayments = payments.filter((p) => p.enrollmentId === enr.id);
    const unpaid = enrPayments.filter((p) => p.status === "unpaid");

    // Sessions the student has actually been marked in, this enrollment.
    const held = sessions.filter(
      (s) => s.classId === enr.classId && s.attendance[student.id] !== undefined
    );

    const amountDue = unpaid.reduce((sum, p) => sum + p.amount, 0);
    const amountPaid = enrPayments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      enrollmentId: enr.id,
      subjectId: enr.subjectId,
      subjectName: subjectName(refs.subjects, enr.subjectId),
      teacherName: teacherName(refs.teachers, enr.teacherId),
      pricePerSession: enr.pricePerSession,
      currentSession: Math.max(held.length, enrPayments.length),
      totalSessions: SESSIONS_PER_PERIOD,
      amountDue,
      amountPaid,
      unpaidPayments: unpaid,
      reminderCount: enrPayments.reduce((sum, p) => sum + p.reminderCount, 0),
    };
  });

  return {
    student,
    subjects,
    totalDue: subjects.reduce((sum, s) => sum + s.amountDue, 0),
    totalPaid: subjects.reduce((sum, s) => sum + s.amountPaid, 0),
  };
}

export interface TeacherPayout {
  earned: number; // teacher's cut of payments already collected
  pending: number; // teacher's cut still owed by students (unpaid)
  schoolEarned: number; // school's cut of collected payments
}

/** Payout summary for a teacher (cahier §11 teacher payout summary). */
export function teacherPayout(
  teacherId: string,
  enrollments: Enrollment[],
  payments: Payment[]
): TeacherPayout {
  const enrIds = new Set(
    enrollments.filter((e) => e.teacherId === teacherId).map((e) => e.id)
  );
  const mine = payments.filter((p) => enrIds.has(p.enrollmentId));
  const paid = mine.filter((p) => p.status === "paid");
  const unpaid = mine.filter((p) => p.status === "unpaid");
  return {
    earned: paid.reduce((sum, p) => sum + p.teacherCut, 0),
    pending: unpaid.reduce((sum, p) => sum + p.teacherCut, 0),
    schoolEarned: paid.reduce((sum, p) => sum + p.schoolCut, 0),
  };
}

export interface TeacherFinance {
  earned: number; // teacher cut of what students have already paid
  pending: number; // teacher cut still owed by students (unpaid)
  schoolEarned: number; // school cut of what students have paid
  paidOut: number; // already paid to the teacher by the school
  remaining: number; // earned - paidOut = what the school still owes the teacher
}

/** Full finance view for a teacher, including what the school still owes them. */
export function teacherFinance(
  teacherId: string,
  enrollments: Enrollment[],
  payments: Payment[],
  payouts: TeacherPayoutRecord[]
): TeacherFinance {
  const p = teacherPayout(teacherId, enrollments, payments);
  const paidOut = payouts.filter((x) => x.teacherId === teacherId).reduce((s, x) => s + x.amount, 0);
  return {
    earned: p.earned,
    pending: p.pending,
    schoolEarned: p.schoolEarned,
    paidOut,
    remaining: Math.max(0, p.earned - paidOut),
  };
}

export interface TeacherStudentContribution {
  student: Student;
  subjectName: string;
  paidToTeacher: number; // teacher cut of this student's paid sessions with this teacher
  pendingToTeacher: number;
}

/** Which students feed a teacher's income, and how much each contributes. */
export function teacherStudentBreakdown(
  teacherId: string,
  students: Student[],
  enrollments: Enrollment[],
  payments: Payment[],
  subjects: Subject[]
): TeacherStudentContribution[] {
  const mine = enrollments.filter((e) => e.teacherId === teacherId);
  return mine
    .map((enr) => {
      const student = students.find((s) => s.id === enr.studentId);
      if (!student) return null;
      const enrPayments = payments.filter((p) => p.enrollmentId === enr.id);
      return {
        student,
        subjectName: subjects.find((s) => s.id === enr.subjectId)?.name ?? "—",
        paidToTeacher: enrPayments.filter((p) => p.status === "paid").reduce((s, p) => s + p.teacherCut, 0),
        pendingToTeacher: enrPayments.filter((p) => p.status === "unpaid").reduce((s, p) => s + p.teacherCut, 0),
      };
    })
    .filter((x): x is TeacherStudentContribution => x !== null);
}

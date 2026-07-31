// TypeScript models for every Firestore collection.
// Mirrors the schema in the Cahier des Charges v1.1 §12.
//
// Dates are stored as epoch milliseconds (number) to keep the domain model plain and
// serializable (localStorage, JSON, tests). Conversion to/from Firestore Timestamp
// happens at the data layer boundary when Firebase is wired in.

// ---- Enums / unions ----------------------------------------------------------

export type Role = "admin" | "teacher" | "student";

export type StudentLevel =
  | "primary"
  | "middle"
  | "high"
  | "level_based"
  | "summer";

export type StudentStatus = "active" | "paused" | "stopped";

export type SessionType =
  | "group"
  | "one_on_one"
  | "group_special"
  | "summer";

export type PaymentMode = "percentage" | "fixed";

export type PaymentStatus = "paid" | "unpaid";

// Attendance states (cahier §4.1) — whether each counts toward payment.
export type AttendanceState = "present" | "absent_paid" | "absent_free";

export type DayOfWeek =
  | "saturday"
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

export type NotificationType =
  | "attendance"
  | "payment_reminder"
  | "daily_digest"
  | "teacher_request"
  | "waiting_list";

// ---- Collections -------------------------------------------------------------

export interface AppUser {
  id: string;
  role: Role;
  displayName: string;
  email?: string;
  phone?: string;
  linkedStudentId?: string; // for student/parent accounts
  teacherId?: string; // for teacher accounts
  fcmTokens?: string[];
  createdAt: number;
}

export interface Student {
  id: string;
  name: string;
  level: StudentLevel;
  phone: string;
  parentName: string;
  parentPhone: string;
  status: StudentStatus;
  enrolledSubjects: string[]; // subject ids
  linkedAccountId?: string;
  createdAt: number;
}

export interface Teacher {
  id: string;
  name: string;
  phone: string;
  subjects: string[]; // subject ids
  paymentMode: PaymentMode;
  schoolCutValue: number; // percentage (0-100) OR fixed amount in DA depending on mode
  negotiatedRate?: number;
  createdAt: number;
}

export interface Subject {
  id: string;
  name: string;
  isCustom: boolean;
  createdAt: number;
}

export interface ClassRoom {
  id: string;
  subjectId: string;
  teacherId: string;
  level: StudentLevel;
  sessionType: SessionType;
  dayOfWeek: DayOfWeek;
  timeSlot: string; // e.g. "16:00-17:30"
  maxStudents: number; // 4..20
  currentStudents: number;
  isLocked: boolean;
  waitingList?: string[]; // studentIds waiting for a spot (cahier §5.3)
  createdAt: number;
}

export interface Enrollment {
  id: string;
  studentId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  pricePerSession: number; // overrideable default price
  startDate: number;
  status: StudentStatus;
}

export interface Session {
  id: string;
  classId: string;
  teacherId: string;
  date: number;
  sessionNumber?: number; // "session X of Y" for the billing period
  notes?: string; // teacher note visible to parent/student
  attendance: Record<string, AttendanceState>; // studentId -> state
}

export interface Payment {
  id: string;
  studentId: string;
  enrollmentId: string;
  sessionId: string;
  amount: number;
  status: PaymentStatus;
  month: string; // "2026-07"
  paidAt?: number;
  schoolCut: number;
  teacherCut: number;
  reminderCount: number; // number of automated reminders sent
  lastReminderAt?: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  createdAt: number;
}

// A payment made BY the school TO a teacher (their earned cut), confirmed by the teacher.
export interface TeacherPayoutRecord {
  id: string;
  teacherId: string;
  amount: number;
  month: string; // "2026-07"
  paidAt: number;
  confirmedByTeacher: boolean;
  confirmedAt?: number;
}

// Self-registration request for students/teachers, reviewed by the admin (cahier flow).
export interface RegistrationRequest {
  id: string; // = Firebase Auth uid (or a uuid in demo)
  role: "student" | "teacher";
  email: string;
  name: string;
  phone: string;
  // student-specific
  level?: StudentLevel;
  parentName?: string;
  parentPhone?: string;
  // teacher-specific
  subjects?: string[];
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  reviewedAt?: number;
}

export interface TeacherSlotRequest {
  id: string;
  teacherId: string;
  subjectId?: string;
  dayOfWeek: DayOfWeek;
  timeSlot: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
}

// Firestore collection names — one place to avoid typos.
export const COLLECTIONS = {
  users: "users",
  students: "students",
  teachers: "teachers",
  subjects: "subjects",
  classes: "classes",
  enrollments: "enrollments",
  sessions: "sessions",
  payments: "payments",
  notifications: "notifications",
  activityLog: "activityLog",
  slotRequests: "slotRequests",
  registrationRequests: "registrationRequests",
  teacherPayouts: "teacherPayouts",
} as const;

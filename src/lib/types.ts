// TypeScript models for every Firestore collection.
// Mirrors the schema in the Cahier des Charges v1.1 §12.
//
// Dates are stored as epoch milliseconds (number) to keep the domain model plain and
// serializable (localStorage, JSON, tests). Conversion to/from Firestore Timestamp
// happens at the data layer boundary when Firebase is wired in.

// ---- Enums / unions ----------------------------------------------------------

export type Role = "admin" | "teacher" | "student";

// Années scolaires algériennes : primaire (5), moyen/CEM (4), secondaire/lycée (3).
export type StudentLevel =
  | "1ap" | "2ap" | "3ap" | "4ap" | "5ap"
  | "1am" | "2am" | "3am" | "4am"
  | "1as" | "2as" | "3as";

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
  | "waiting_list"
  | "enrollment";

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
  /** Which teachers may teach this subject, per school level. A student only
   *  ever sees the teachers listed for their own level, and a level with no
   *  entry simply isn't offered. e.g. { "3as": ["t1", "t2"], "4am": ["t1"] } */
  teachersByLevel: Partial<Record<StudentLevel, string[]>>;
  createdAt: number;
}

/** A physical room in the centre. Several classes can run at the same time as
 *  long as they are in different rooms — which is why a time slot is only
 *  "taken" per room, never globally. */
export interface Room {
  id: string;
  name: string;
  /** Rough size, used to sort and to warn when a group outgrows the room. */
  capacity: number;
  kind: "large" | "standard" | "individual" | "office";
}

export interface ClassRoom {
  id: string;
  subjectId: string;
  teacherId: string;
  /** Which physical room this class occupies. */
  roomId: string;
  level: StudentLevel;
  sessionType: SessionType;
  dayOfWeek: DayOfWeek;
  timeSlot: string; // e.g. "16:00-17:30"
  maxStudents: number; // 4..20
  /** Price each student in this group pays per session. */
  pricePerSession: number;
  /** School's share, set when the group is formed. Defaults to 25% but can be a
   *  fixed DA amount instead. Overrides anything on the teacher record. */
  schoolCutMode: PaymentMode;
  schoolCutValue: number;
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
  // student-chosen preferred group (class) — the admin assigns it officially on approval
  preferredClassId?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  reviewedAt?: number;
}

/** A student's request to study a subject with a chosen teacher (تسجيل).
 *  Sits in the admin's queue until they group several of these into a class. */
export interface EnrollmentRequest {
  id: string;
  studentId: string;
  subjectId: string;
  teacherId: string;
  status: "pending" | "grouped" | "rejected";
  /** Set when the admin forms a group from this request. */
  classId?: string;
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
  rooms: "rooms",
  classes: "classes",
  enrollments: "enrollments",
  sessions: "sessions",
  payments: "payments",
  notifications: "notifications",
  activityLog: "activityLog",
  slotRequests: "slotRequests",
  registrationRequests: "registrationRequests",
  enrollmentRequests: "enrollmentRequests",
  teacherPayouts: "teacherPayouts",
} as const;

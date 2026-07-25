// Demo data used in DEMO_MODE so every feature is populated and works without a backend.
// Fixed IDs let the demo logins (teacher/student) link to a real record.
import { computeCut } from "../lib/payments";
import { billingMonth } from "../lib/format";
import type {
  AppUser,
  Student,
  Teacher,
  Subject,
  ClassRoom,
  Enrollment,
  Session,
  Payment,
  AppNotification,
  ActivityLog,
  TeacherSlotRequest,
} from "../lib/types";

const DAY = 86_400_000;
const now = Date.now();
const month = billingMonth();

export interface SeedData {
  users: AppUser[];
  students: Student[];
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassRoom[];
  enrollments: Enrollment[];
  sessions: Session[];
  payments: Payment[];
  notifications: AppNotification[];
  activityLog: ActivityLog[];
  slotRequests: TeacherSlotRequest[];
}

// ---- Subjects (default set from cahier §7) ----
const subjects: Subject[] = [
  { id: "sub_math", name: "Mathématiques", isCustom: false, createdAt: now },
  { id: "sub_arabic", name: "العربية", isCustom: false, createdAt: now },
  { id: "sub_english", name: "English", isCustom: false, createdAt: now },
  { id: "sub_french", name: "Français", isCustom: false, createdAt: now },
  { id: "sub_science", name: "Sciences", isCustom: false, createdAt: now },
  { id: "sub_physics", name: "Physique", isCustom: false, createdAt: now },
];

// ---- Teachers ----
const teachers: Teacher[] = [
  {
    id: "t1",
    name: "Amine Belkacem",
    phone: "0550 11 22 33",
    subjects: ["sub_english", "sub_french"],
    paymentMode: "percentage",
    schoolCutValue: 25, // school takes 25%
    createdAt: now,
  },
  {
    id: "t2",
    name: "Sara Haddad",
    phone: "0661 44 55 66",
    subjects: ["sub_math", "sub_physics"],
    paymentMode: "fixed",
    schoolCutValue: 1500, // school takes 1500 DA / session
    createdAt: now,
  },
];

// ---- Students ----
const students: Student[] = [
  {
    id: "s1",
    name: "Ahmed Saïdi",
    level: "high",
    phone: "0770 10 20 30",
    parentName: "Karim Saïdi",
    parentPhone: "0770 99 88 77",
    status: "active",
    enrolledSubjects: ["sub_english", "sub_math"],
    linkedAccountId: "u_student",
    createdAt: now - 40 * DAY,
  },
  {
    id: "s2",
    name: "Lina Meziane",
    level: "middle",
    phone: "0771 11 21 31",
    parentName: "Nadia Meziane",
    parentPhone: "0771 91 81 71",
    status: "active",
    enrolledSubjects: ["sub_english"],
    createdAt: now - 30 * DAY,
  },
  {
    id: "s3",
    name: "Yacine Boudiaf",
    level: "high",
    phone: "0772 12 22 32",
    parentName: "Rachid Boudiaf",
    parentPhone: "0772 92 82 72",
    status: "active",
    enrolledSubjects: ["sub_english", "sub_french"],
    createdAt: now - 20 * DAY,
  },
];

// ---- Classes ----
const classes: ClassRoom[] = [
  {
    id: "c1",
    subjectId: "sub_english",
    teacherId: "t1",
    level: "high",
    sessionType: "group",
    dayOfWeek: "monday",
    timeSlot: "17:00-18:30",
    maxStudents: 15,
    currentStudents: 2,
    isLocked: false,
    createdAt: now - 45 * DAY,
  },
  {
    id: "c2",
    subjectId: "sub_french",
    teacherId: "t1",
    level: "high",
    sessionType: "group_special",
    dayOfWeek: "wednesday",
    timeSlot: "18:30-20:00",
    maxStudents: 12,
    currentStudents: 1,
    isLocked: false,
    createdAt: now - 45 * DAY,
  },
  {
    id: "c3",
    subjectId: "sub_math",
    teacherId: "t2",
    level: "high",
    sessionType: "one_on_one",
    dayOfWeek: "tuesday",
    timeSlot: "15:30-17:00",
    maxStudents: 4,
    currentStudents: 1,
    isLocked: false,
    createdAt: now - 45 * DAY,
  },
];

// ---- Enrollments ----
const enrollments: Enrollment[] = [
  { id: "e1", studentId: "s1", classId: "c1", subjectId: "sub_english", teacherId: "t1", pricePerSession: 2700, startDate: now - 40 * DAY, status: "active" },
  { id: "e2", studentId: "s1", classId: "c3", subjectId: "sub_math", teacherId: "t2", pricePerSession: 5000, startDate: now - 40 * DAY, status: "active" },
  { id: "e3", studentId: "s2", classId: "c1", subjectId: "sub_english", teacherId: "t1", pricePerSession: 2700, startDate: now - 30 * DAY, status: "active" },
  { id: "e4", studentId: "s3", classId: "c1", subjectId: "sub_english", teacherId: "t1", pricePerSession: 2700, startDate: now - 20 * DAY, status: "active" },
  { id: "e5", studentId: "s3", classId: "c2", subjectId: "sub_french", teacherId: "t1", pricePerSession: 3000, startDate: now - 20 * DAY, status: "active" },
];

// ---- Sessions (3 weekly English sessions already held this month) ----
const sessions: Session[] = [
  {
    id: "sess_c1_1",
    classId: "c1",
    teacherId: "t1",
    date: now - 21 * DAY,
    sessionNumber: 1,
    notes: "Révision des temps du présent.",
    attendance: { s1: "present", s2: "present", s3: "present" },
  },
  {
    id: "sess_c1_2",
    classId: "c1",
    teacherId: "t1",
    date: now - 14 * DAY,
    sessionNumber: 2,
    attendance: { s1: "present", s2: "absent_free", s3: "present" },
  },
  {
    id: "sess_c1_3",
    classId: "c1",
    teacherId: "t1",
    date: now - 7 * DAY,
    sessionNumber: 3,
    attendance: { s1: "absent_paid", s2: "present", s3: "present" },
  },
  {
    id: "sess_c3_1",
    classId: "c3",
    teacherId: "t2",
    date: now - 20 * DAY,
    sessionNumber: 1,
    attendance: { s1: "present" },
  },
];

// ---- Payments ----
// Helper builds a payment with the correct school/teacher split.
function pay(
  id: string,
  studentId: string,
  enrollmentId: string,
  sessionId: string,
  price: number,
  teacher: Teacher,
  status: "paid" | "unpaid",
  reminderCount = 0
): Payment {
  const { schoolCut, teacherCut } = computeCut(price, teacher.paymentMode, teacher.schoolCutValue);
  return {
    id,
    studentId,
    enrollmentId,
    sessionId,
    amount: price,
    status,
    month,
    paidAt: status === "paid" ? now - 5 * DAY : undefined,
    schoolCut,
    teacherCut,
    reminderCount,
    lastReminderAt: reminderCount > 0 ? now - 2 * DAY : undefined,
  };
}

const t1 = teachers[0];
const t2 = teachers[1];

const payments: Payment[] = [
  // Ahmed (s1) — English: session 1 paid, sessions 2 & 3 unpaid (debt + reminders sent)
  pay("p1", "s1", "e1", "sess_c1_1", 2700, t1, "paid"),
  pay("p2", "s1", "e1", "sess_c1_2", 2700, t1, "unpaid", 2),
  pay("p3", "s1", "e1", "sess_c1_3", 2700, t1, "unpaid", 1),
  // Ahmed (s1) — Math: session 1 paid
  pay("p4", "s1", "e2", "sess_c3_1", 5000, t2, "paid"),
  // Lina (s2) — English: session 1 paid, session 3 unpaid
  pay("p5", "s2", "e3", "sess_c1_1", 2700, t1, "paid"),
  pay("p6", "s2", "e3", "sess_c1_3", 2700, t1, "unpaid", 1),
  // Yacine (s3) — English: all paid
  pay("p7", "s3", "e4", "sess_c1_1", 2700, t1, "paid"),
  pay("p8", "s3", "e4", "sess_c1_2", 2700, t1, "paid"),
  pay("p9", "s3", "e4", "sess_c1_3", 2700, t1, "paid"),
];

// ---- Users (for demo auth) ----
const users: AppUser[] = [
  { id: "u_admin", role: "admin", displayName: "Directeur Horizon", email: "admin@horizon.dz", createdAt: now },
  { id: "u_teacher", role: "teacher", displayName: "Amine Belkacem", teacherId: "t1", createdAt: now },
  { id: "u_student", role: "student", displayName: "Famille Saïdi", linkedStudentId: "s1", createdAt: now },
];

// ---- Notifications ----
const notifications: AppNotification[] = [
  { id: "n1", userId: "u_student", type: "payment_reminder", message: "Rappel : le paiement de English est en attente — 2 700 DA.", read: false, createdAt: now - 2 * DAY },
  { id: "n2", userId: "u_student", type: "attendance", message: "Ahmed a été marqué Absent (facturé) en English — la séance sera facturée.", read: true, createdAt: now - 7 * DAY },
  { id: "n3", userId: "u_admin", type: "daily_digest", message: "Programme du jour : 2 classes. Demain : 1 classe.", read: false, createdAt: now - 1 * DAY },
  { id: "n4", userId: "u_admin", type: "teacher_request", message: "Amine demande un créneau : jeudi 17:00-18:30.", read: false, createdAt: now - 3 * DAY },
];

// ---- Activity log ----
const activityLog: ActivityLog[] = [
  { id: "a1", userId: "u_admin", action: "student.create", details: "Ajout de l'étudiant Ahmed Saïdi", createdAt: now - 40 * DAY },
  { id: "a2", userId: "u_teacher", action: "attendance.mark", details: "Présence marquée pour English (séance 3)", createdAt: now - 7 * DAY },
];

// ---- Slot requests ----
const slotRequests: TeacherSlotRequest[] = [
  { id: "sr1", teacherId: "t1", subjectId: "sub_english", dayOfWeek: "thursday", timeSlot: "17:00-18:30", status: "pending", createdAt: now - 3 * DAY },
];

export function makeSeed(): SeedData {
  return {
    users,
    students,
    teachers,
    subjects,
    classes,
    enrollments,
    sessions,
    payments,
    notifications,
    activityLog,
    slotRequests,
  };
}

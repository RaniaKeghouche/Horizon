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
  Room,
  Enrollment,
  Session,
  Payment,
  AppNotification,
  ActivityLog,
  TeacherSlotRequest,
  RegistrationRequest,
  EnrollmentRequest,
  TeacherPayoutRecord,
} from "../lib/types";

const DAY = 86_400_000;
const now = Date.now();
const month = billingMonth();

export interface SeedData {
  users: AppUser[];
  students: Student[];
  teachers: Teacher[];
  subjects: Subject[];
  rooms: Room[];
  classes: ClassRoom[];
  enrollments: Enrollment[];
  sessions: Session[];
  payments: Payment[];
  notifications: AppNotification[];
  activityLog: ActivityLog[];
  slotRequests: TeacherSlotRequest[];
  registrationRequests: RegistrationRequest[];
  teacherPayouts: TeacherPayoutRecord[];
  enrollmentRequests: EnrollmentRequest[];
}

// ---- Subjects (default set from cahier §7) ----
const subjects: Subject[] = [
  { id: "sub_math", name: "Mathématiques", isCustom: false, teachersByLevel: { "5ap": ["t3"], "4am": ["t2", "t4"], "3as": ["t2"] }, createdAt: now },
  { id: "sub_arabic", name: "العربية", isCustom: false, teachersByLevel: { "5ap": ["t3"], "4am": ["t3"] }, createdAt: now },
  { id: "sub_english", name: "English", isCustom: false, teachersByLevel: { "4am": ["t1"], "1as": ["t1", "t4"], "3as": ["t1"] }, createdAt: now },
  { id: "sub_french", name: "Français", isCustom: false, teachersByLevel: { "5ap": ["t3"], "3as": ["t1"] }, createdAt: now },
  { id: "sub_science", name: "Sciences", isCustom: false, teachersByLevel: { "4am": ["t4"] }, createdAt: now },
  { id: "sub_physics", name: "Physique", isCustom: false, teachersByLevel: { "1as": ["t2"], "3as": ["t2", "t4"] }, createdAt: now },
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
  {
    id: "t3",
    name: "Yacine Cherif",
    phone: "0555 77 88 99",
    subjects: ["sub_arabic", "sub_french", "sub_math"],
    paymentMode: "percentage",
    schoolCutValue: 30,
    createdAt: now,
  },
  {
    id: "t4",
    name: "Nawal Bensalem",
    phone: "0669 12 34 56",
    subjects: ["sub_science", "sub_physics", "sub_english", "sub_math"],
    paymentMode: "percentage",
    schoolCutValue: 25,
    createdAt: now,
  },
];

// ---- Rooms ----
// The centre has five physical rooms; classes only clash when they share one.
const rooms: Room[] = [
  { id: "rm_big", name: "Grande salle", capacity: 20, kind: "large" },
  { id: "rm_1", name: "Classe 1", capacity: 12, kind: "standard" },
  { id: "rm_2", name: "Classe 2", capacity: 12, kind: "standard" },
  { id: "rm_indiv", name: "Salle individuelle", capacity: 2, kind: "individual" },
  { id: "rm_office", name: "Bureau", capacity: 4, kind: "office" },
];

// ---- Students ----
const students: Student[] = [
  {
    id: "s1",
    name: "Ahmed Saïdi",
    level: "3as",
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
    level: "3am",
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
    level: "3as",
    phone: "0772 12 22 32",
    parentName: "Rachid Boudiaf",
    parentPhone: "0772 92 82 72",
    status: "active",
    enrolledSubjects: ["sub_english", "sub_french"],
    createdAt: now - 20 * DAY,
  },
  {
    id: "s4",
    name: "Yasmine Torki",
    level: "4am",
    phone: "0772 12 22 32",
    parentName: "Samir Torki",
    parentPhone: "0772 92 82 72",
    status: "active",
    enrolledSubjects: [],
    createdAt: now - 20 * DAY,
  },
  {
    id: "s5",
    name: "Rayan Belhadj",
    level: "4am",
    phone: "0773 13 23 33",
    parentName: "Hakim Belhadj",
    parentPhone: "0773 93 83 73",
    status: "active",
    enrolledSubjects: [],
    createdAt: now - 18 * DAY,
  },
  {
    id: "s6",
    name: "Imane Cherifi",
    level: "4am",
    phone: "0774 14 24 34",
    parentName: "Leila Cherifi",
    parentPhone: "0774 94 84 74",
    status: "active",
    enrolledSubjects: [],
    createdAt: now - 15 * DAY,
  },
  {
    id: "s7",
    name: "Mehdi Larbi",
    level: "5ap",
    phone: "0775 15 25 35",
    parentName: "Omar Larbi",
    parentPhone: "0775 95 85 75",
    status: "active",
    enrolledSubjects: [],
    createdAt: now - 12 * DAY,
  },
  {
    id: "s8",
    name: "Sirine Amrani",
    level: "1as",
    phone: "0776 16 26 36",
    parentName: "Fatima Amrani",
    parentPhone: "0776 96 86 76",
    status: "active",
    enrolledSubjects: [],
    createdAt: now - 10 * DAY,
  },
];

// ---- Classes ----
const classes: ClassRoom[] = [
  {
    id: "c1",
    subjectId: "sub_english",
    teacherId: "t1",
    roomId: "rm_big",
    level: "3as",
    sessionType: "group",
    dayOfWeek: "monday",
    timeSlot: "16:00-18:00",
    maxStudents: 15,
    pricePerSession: 2700,
    schoolCutMode: "percentage",
    schoolCutValue: 25,
    currentStudents: 2,
    isLocked: false,
    createdAt: now - 45 * DAY,
  },
  {
    id: "c2",
    subjectId: "sub_french",
    teacherId: "t1",
    roomId: "rm_1",
    level: "3as",
    sessionType: "group_special",
    dayOfWeek: "wednesday",
    timeSlot: "18:00-20:00",
    maxStudents: 12,
    pricePerSession: 2700,
    schoolCutMode: "percentage",
    schoolCutValue: 25,
    currentStudents: 1,
    isLocked: false,
    createdAt: now - 45 * DAY,
  },
  {
    id: "c3",
    subjectId: "sub_math",
    teacherId: "t2",
    roomId: "rm_indiv",
    level: "3as",
    sessionType: "one_on_one",
    dayOfWeek: "tuesday",
    timeSlot: "14:00-16:00",
    maxStudents: 4,
    pricePerSession: 2700,
    schoolCutMode: "percentage",
    schoolCutValue: 25,
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
  { id: "sr1", teacherId: "t1", subjectId: "sub_english", dayOfWeek: "thursday", timeSlot: "16:00-18:00", status: "pending", createdAt: now - 3 * DAY },
];

// Two pending self-registration requests so the admin can test approve/reject.
const registrationRequests: RegistrationRequest[] = [
  {
    id: "req_student_1",
    role: "student",
    email: "sofiane.parent@example.com",
    name: "Sofiane Belarbi",
    phone: "0773 55 66 77",
    level: "3am",
    parentName: "Nabil Belarbi",
    parentPhone: "0773 11 22 33",
    status: "pending",
    createdAt: now - 1 * DAY,
  },
  {
    id: "req_teacher_1",
    role: "teacher",
    email: "leila.prof@example.com",
    name: "Leïla Bouzid",
    phone: "0664 88 99 00",
    subjects: ["sub_math", "sub_physics"],
    status: "pending",
    createdAt: now - 2 * DAY,
  },
];

// ---- Enrolment requests (تسجيلات) waiting to be grouped ----
const enrollmentRequests: EnrollmentRequest[] = [
  { id: "er1", studentId: "s4", subjectId: "sub_math", teacherId: "t2", status: "pending", createdAt: now - 6 * DAY },
  { id: "er2", studentId: "s5", subjectId: "sub_math", teacherId: "t2", status: "pending", createdAt: now - 5 * DAY },
  { id: "er3", studentId: "s6", subjectId: "sub_math", teacherId: "t2", status: "pending", createdAt: now - 5 * DAY },
  // a second bucket: same subject, the other teacher
  { id: "er4", studentId: "s6", subjectId: "sub_science", teacherId: "t4", status: "pending", createdAt: now - 4 * DAY },
  // primary-school pair
  { id: "er5", studentId: "s7", subjectId: "sub_arabic", teacherId: "t3", status: "pending", createdAt: now - 3 * DAY },
  { id: "er6", studentId: "s8", subjectId: "sub_english", teacherId: "t4", status: "pending", createdAt: now - 2 * DAY },
];

export function makeSeed(): SeedData {
  return {
    users,
    students,
    teachers,
    subjects,
    rooms,
    classes,
    enrollments,
    sessions,
    payments,
    notifications,
    activityLog,
    slotRequests,
    registrationRequests,
    teacherPayouts: [],
    enrollmentRequests,
  };
}

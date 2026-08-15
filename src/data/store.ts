// Application store (Zustand). Two modes:
//  - DEMO_MODE: seeded local data persisted to localStorage (no backend).
//  - Firebase mode: starts empty; firebaseSync mirrors Firestore into it in real time,
//    and each action also writes to Firestore via the fb.* helpers.
// Components read/write through this store and never change between modes.
import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { makeSeed } from "./seed";
import { fbWrite, fbPatch, fbDelete, fbWriteMany } from "./fb";
import { DEMO_MODE } from "../lib/config";
import { computeCut, isBillable, defaultPrice } from "../lib/payments";
import { billingMonth } from "../lib/format";
import { DAY_LABEL } from "../lib/labels";
import {
  COLLECTIONS,
  type ActivityLog,
  type AppNotification,
  type ClassRoom,
  type Enrollment,
  type Payment,
  type Role,
  type Room,
  type Session,
  type RegistrationRequest,
  type EnrollmentRequest,
  type Student,
  type Subject,
  type Teacher,
  type TeacherPayoutRecord,
  type TeacherSlotRequest,
} from "../lib/types";

const uid = () => crypto.randomUUID();
const now = () => Date.now();

const EMPTY = () => ({
  users: [] as ReturnType<typeof makeSeed>["users"],
  students: [] as Student[],
  teachers: [] as Teacher[],
  subjects: [] as Subject[],
  rooms: [] as Room[],
  classes: [] as ClassRoom[],
  enrollments: [] as Enrollment[],
  sessions: [] as Session[],
  payments: [] as Payment[],
  notifications: [] as AppNotification[],
  activityLog: [] as ActivityLog[],
  slotRequests: [] as TeacherSlotRequest[],
  registrationRequests: [] as RegistrationRequest[],
  teacherPayouts: [] as TeacherPayoutRecord[],
  enrollmentRequests: [] as EnrollmentRequest[],
});

interface DataState {
  users: ReturnType<typeof makeSeed>["users"];
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

  log: (userId: string, action: string, details: string) => void;

  addSubject: (name: string, teachersByLevel?: Subject["teachersByLevel"]) => Subject;
  updateSubject: (id: string, patch: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;

  addStudent: (data: Omit<Student, "id" | "createdAt" | "enrolledSubjects" | "status"> & { status?: Student["status"] }) => Student;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  deleteStudent: (id: string) => void;

  addTeacher: (data: Omit<Teacher, "id" | "createdAt">) => Teacher;
  updateTeacher: (id: string, patch: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;

  addClass: (data: Omit<ClassRoom, "id" | "createdAt" | "currentStudents" | "isLocked">) => ClassRoom;
  updateClass: (id: string, patch: Partial<ClassRoom>) => void;
  deleteClass: (id: string) => void;

  enroll: (studentId: string, classId: string, pricePerSession: number) => void;
  unenroll: (enrollmentId: string) => void;
  selfEnroll: (studentId: string, classId: string) => void; // student enrolls; admins notified
  adminAssign: (studentId: string, classId: string, price: number) => void; // admin enrolls; student notified
  moveStudent: (enrollmentId: string, newClassId: string) => void; // admin moves group; student notified

  saveAttendance: (
    classId: string,
    teacherId: string,
    date: number,
    attendance: Record<string, Session["attendance"][string]>,
    notes?: string,
    sessionId?: string
  ) => void;

  markPaid: (paymentId: string) => void;
  markUnpaid: (paymentId: string) => void;
  markMonthPaid: (studentId: string, month: string) => void;
  markMonthUnpaid: (studentId: string, month: string) => void;
  sendReminder: (paymentId: string) => void;

  // Teacher payouts (school -> teacher)
  payTeacher: (teacherId: string, amount: number, month: string) => void;
  confirmPayout: (payoutId: string) => void;

  addNotification: (userId: string, type: AppNotification["type"], message: string) => void;
  markNotificationRead: (id: string) => void;

  resolveSlotRequest: (id: string, status: "approved" | "rejected") => void;
  addSlotRequest: (teacherId: string, subjectId: string | undefined, dayOfWeek: TeacherSlotRequest["dayOfWeek"], timeSlot: string) => void;

  joinWaitlist: (classId: string, studentId: string) => void;
  leaveWaitlist: (classId: string, studentId: string) => void;

  // Enrolment requests (تسجيل): student picks subject + teacher, admin groups them
  requestEnrollment: (studentId: string, subjectId: string, teacherId: string) => EnrollmentRequest | null;
  cancelEnrollmentRequest: (id: string) => void;
  rejectEnrollmentRequest: (id: string) => void;
  /** Turn a set of pending requests into a real group. */
  formGroupFromRequests: (
    requestIds: string[],
    opts: {
      dayOfWeek: ClassRoom["dayOfWeek"];
      timeSlot: string;
      roomId: string;
      pricePerSession: number;
      schoolCutMode: ClassRoom["schoolCutMode"];
      schoolCutValue: number;
      maxStudents?: number;
    }
  ) => ClassRoom | null;

  // Registration requests (student/teacher self-signup reviewed by admin)
  addRegistrationRequest: (req: Omit<RegistrationRequest, "status" | "createdAt"> & { id: string }) => void;
  approveRegistration: (requestId: string) => { email: string; name: string } | null;
  rejectRegistration: (requestId: string) => { email: string; name: string } | null;

  resetToSeed: () => void;
  /** Push the demo dataset into the store AND (in Supabase mode) into the
   *  database, so a fresh project has something to look at. */
  loadDemoData: () => void;
}

const noopStorage: StateStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

export const useData = create<DataState>()(
  persist(
    (set, get) => ({
      ...(DEMO_MODE ? makeSeed() : EMPTY()),

      log: (userId, action, details) => {
        const entry: ActivityLog = { id: uid(), userId, action, details, createdAt: now() };
        set((s) => ({ activityLog: [entry, ...s.activityLog] }));
        fbWrite(COLLECTIONS.activityLog, entry);
      },

      // ---- Subjects ----
      addSubject: (name, teachersByLevel = {}) => {
        const subject: Subject = { id: uid(), name, isCustom: true, teachersByLevel, createdAt: now() };
        set((s) => ({ subjects: [...s.subjects, subject] }));
        fbWrite(COLLECTIONS.subjects, subject);
        return subject;
      },
      updateSubject: (id, patch) => {
        set((s) => ({ subjects: s.subjects.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
        fbPatch(COLLECTIONS.subjects, id, patch);
      },
      deleteSubject: (id) => {
        set((s) => ({ subjects: s.subjects.filter((x) => x.id !== id) }));
        fbDelete(COLLECTIONS.subjects, id);
      },

      // ---- Students ----
      addStudent: (data) => {
        const student: Student = {
          id: uid(),
          createdAt: now(),
          status: data.status ?? "active",
          enrolledSubjects: [],
          ...data,
        };
        set((s) => ({ students: [...s.students, student] }));
        fbWrite(COLLECTIONS.students, student);
        get().log("u_admin", "student.create", `Ajout de l'étudiant ${student.name}`);
        return student;
      },
      updateStudent: (id, patch) => {
        set((s) => ({ students: s.students.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
        fbPatch(COLLECTIONS.students, id, patch);
      },
      deleteStudent: (id) => {
        const removed = get().enrollments.filter((e) => e.studentId === id);
        set((s) => ({
          students: s.students.filter((x) => x.id !== id),
          enrollments: s.enrollments.filter((e) => e.studentId !== id),
        }));
        fbDelete(COLLECTIONS.students, id);
        removed.forEach((e) => fbDelete(COLLECTIONS.enrollments, e.id));
      },

      // ---- Teachers ----
      addTeacher: (data) => {
        const teacher: Teacher = { id: uid(), createdAt: now(), ...data };
        set((s) => ({ teachers: [...s.teachers, teacher] }));
        fbWrite(COLLECTIONS.teachers, teacher);
        get().log("u_admin", "teacher.create", `Ajout de l'enseignant ${teacher.name}`);
        return teacher;
      },
      updateTeacher: (id, patch) => {
        set((s) => ({ teachers: s.teachers.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
        fbPatch(COLLECTIONS.teachers, id, patch);
      },
      deleteTeacher: (id) => {
        set((s) => ({ teachers: s.teachers.filter((x) => x.id !== id) }));
        fbDelete(COLLECTIONS.teachers, id);
      },

      // ---- Classes ----
      addClass: (data) => {
        const klass: ClassRoom = { id: uid(), createdAt: now(), currentStudents: 0, isLocked: false, ...data };
        set((s) => ({ classes: [...s.classes, klass] }));
        fbWrite(COLLECTIONS.classes, klass);
        // Notify the assigned teacher of their new slot (schedule is admin-managed).
        const account = get().users.find((u) => u.teacherId === data.teacherId);
        if (account) {
          const subj = get().subjects.find((s) => s.id === data.subjectId)?.name ?? "un cours";
          get().addNotification(account.id, "teacher_request", `Nouveau créneau qui vous est assigné : ${subj} · ${DAY_LABEL[data.dayOfWeek]} ${data.timeSlot}.`);
        }
        get().log("u_admin", "class.create", `Nouvelle classe ${data.timeSlot}`);
        return klass;
      },
      updateClass: (id, patch) => {
        const old = get().classes.find((c) => c.id === id);
        set((s) => ({ classes: s.classes.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
        fbPatch(COLLECTIONS.classes, id, patch);
        // Notify the teacher when they get (re)assigned or their slot time changes.
        const newTeacherId = (patch.teacherId as string) ?? old?.teacherId;
        const changedTeacher = !!patch.teacherId && patch.teacherId !== old?.teacherId;
        const changedTime =
          (!!patch.timeSlot && patch.timeSlot !== old?.timeSlot) ||
          (!!patch.dayOfWeek && patch.dayOfWeek !== old?.dayOfWeek);
        if ((changedTeacher || changedTime) && newTeacherId) {
          const account = get().users.find((u) => u.teacherId === newTeacherId);
          if (account) {
            const merged = { ...old, ...patch } as ClassRoom;
            const subj = get().subjects.find((s) => s.id === merged.subjectId)?.name ?? "un cours";
            const msg = changedTeacher
              ? `Un créneau vous a été assigné : ${subj} · ${DAY_LABEL[merged.dayOfWeek]} ${merged.timeSlot}.`
              : `Votre créneau ${subj} a été modifié : ${DAY_LABEL[merged.dayOfWeek]} ${merged.timeSlot}.`;
            get().addNotification(account.id, "teacher_request", msg);
          }
        }
      },
      deleteClass: (id) => {
        const removed = get().enrollments.filter((e) => e.classId === id);
        set((s) => ({
          classes: s.classes.filter((x) => x.id !== id),
          enrollments: s.enrollments.filter((e) => e.classId !== id),
        }));
        fbDelete(COLLECTIONS.classes, id);
        removed.forEach((e) => fbDelete(COLLECTIONS.enrollments, e.id));
      },

      // ---- Enrollment (cahier §6.2) ----
      enroll: (studentId, classId, pricePerSession) => {
        const state = get();
        const klass = state.classes.find((c) => c.id === classId);
        const student = state.students.find((s) => s.id === studentId);
        if (!klass || !student) return;
        if (state.enrollments.some((e) => e.studentId === studentId && e.classId === classId)) return;
        if (klass.currentStudents >= klass.maxStudents) return; // full — use the waiting list

        const enrollment: Enrollment = {
          id: uid(),
          studentId,
          classId,
          subjectId: klass.subjectId,
          teacherId: klass.teacherId,
          pricePerSession,
          startDate: now(),
          status: "active",
        };
        const nextCount = klass.currentStudents + 1;
        const isLocked = nextCount >= klass.maxStudents;
        const newSubjects = student.enrolledSubjects.includes(klass.subjectId)
          ? student.enrolledSubjects
          : [...student.enrolledSubjects, klass.subjectId];

        set((s) => ({
          enrollments: [...s.enrollments, enrollment],
          classes: s.classes.map((c) => (c.id === classId ? { ...c, currentStudents: nextCount, isLocked } : c)),
          students: s.students.map((st) => (st.id === studentId ? { ...st, enrolledSubjects: newSubjects } : st)),
        }));
        fbWrite(COLLECTIONS.enrollments, enrollment);
        fbPatch(COLLECTIONS.classes, classId, { currentStudents: nextCount, isLocked });
        fbPatch(COLLECTIONS.students, studentId, { enrolledSubjects: newSubjects });
        get().log("u_admin", "enroll", `${student.name} inscrit à une classe`);
      },
      unenroll: (enrollmentId) => {
        const state = get();
        const enr = state.enrollments.find((e) => e.id === enrollmentId);
        if (!enr) return;
        const klass = state.classes.find((c) => c.id === enr.classId);
        const nextCount = Math.max(0, (klass?.currentStudents ?? 1) - 1);
        set((s) => ({
          enrollments: s.enrollments.filter((e) => e.id !== enrollmentId),
          classes: s.classes.map((c) => (c.id === enr.classId ? { ...c, currentStudents: nextCount, isLocked: false } : c)),
        }));
        fbDelete(COLLECTIONS.enrollments, enrollmentId);
        fbPatch(COLLECTIONS.classes, enr.classId, { currentStudents: nextCount, isLocked: false });

        // A spot opened: notify the first student on the waiting list + the admins.
        const waitingFirst = klass?.waitingList?.[0];
        if (waitingFirst) {
          const waited = state.students.find((s) => s.id === waitingFirst);
          if (waited?.linkedAccountId) {
            get().addNotification(waited.linkedAccountId, "waiting_list", `Une place s'est libérée dans une de vos classes en attente.`);
          }
          state.users
            .filter((u) => u.role === "admin")
            .forEach((admin) => get().addNotification(admin.id, "waiting_list", `Place libérée : ${waited?.name ?? "un élève"} peut être inscrit (liste d'attente).`));
        }
      },

      // Student self-enrolls into a group → admins are notified.
      selfEnroll: (studentId, classId) => {
        const state = get();
        const klass = state.classes.find((c) => c.id === classId);
        const student = state.students.find((s) => s.id === studentId);
        if (!klass || !student) return;
        get().enroll(studentId, classId, defaultPrice(klass.sessionType, klass.level) ?? 2000);
        if (get().enrollments.some((e) => e.studentId === studentId && e.classId === classId)) {
          const subj = state.subjects.find((s) => s.id === klass.subjectId)?.name ?? "un cours";
          state.users
            .filter((u) => u.role === "admin")
            .forEach((a) => get().addNotification(a.id, "enrollment", `${student.name} s'est inscrit(e) au groupe ${subj} (${klass.timeSlot}).`));
        }
      },

      // Admin assigns a student to a group → the student is notified.
      adminAssign: (studentId, classId, price) => {
        get().enroll(studentId, classId, price);
        const state = get();
        const student = state.students.find((s) => s.id === studentId);
        const klass = state.classes.find((c) => c.id === classId);
        if (student?.linkedAccountId && klass && get().enrollments.some((e) => e.studentId === studentId && e.classId === classId)) {
          const subj = state.subjects.find((s) => s.id === klass.subjectId)?.name ?? "un cours";
          get().addNotification(student.linkedAccountId, "enrollment", `Vous avez été affecté(e) au groupe ${subj} (${klass.timeSlot}).`);
        }
      },

      // Admin moves a student from one group to another → the student is notified.
      moveStudent: (enrollmentId, newClassId) => {
        const state = get();
        const enr = state.enrollments.find((e) => e.id === enrollmentId);
        const newClass = state.classes.find((c) => c.id === newClassId);
        if (!enr || !newClass) return;
        const student = state.students.find((s) => s.id === enr.studentId);
        const price = defaultPrice(newClass.sessionType, newClass.level) ?? enr.pricePerSession;
        get().unenroll(enrollmentId);
        get().enroll(enr.studentId, newClassId, price);
        if (student?.linkedAccountId && get().enrollments.some((e) => e.studentId === enr.studentId && e.classId === newClassId)) {
          const subj = state.subjects.find((s) => s.id === newClass.subjectId)?.name ?? "un cours";
          get().addNotification(student.linkedAccountId, "enrollment", `Vous avez été déplacé(e) vers le groupe ${subj} (${newClass.timeSlot}).`);
        }
      },

      // ---- Attendance (cahier §4) ----
      saveAttendance: (classId, teacherId, date, attendance, notes, sessionId) => {
        const state = get();
        const klass = state.classes.find((c) => c.id === classId);
        if (!klass) return;
        const teacher = state.teachers.find((t) => t.id === teacherId);

        const id = sessionId ?? uid();
        // Session number = its rank among this class's sessions (kept when editing).
        const existing = state.sessions.find((s) => s.id === id);
        const sessionNumber =
          existing?.sessionNumber ?? state.sessions.filter((s) => s.classId === classId).length + 1;
        const session: Session = { id, classId, teacherId, date, notes, attendance, sessionNumber };

        const newPayments: Payment[] = [];
        const newNotifs: AppNotification[] = [];
        const month = billingMonth(new Date(date));

        for (const [studentId, stateVal] of Object.entries(attendance)) {
          const enr = state.enrollments.find((e) => e.studentId === studentId && e.classId === classId);
          const student = state.students.find((s) => s.id === studentId);

          if (
            enr &&
            teacher &&
            isBillable(stateVal) &&
            !state.payments.some((p) => p.enrollmentId === enr.id && p.sessionId === id)
          ) {
            const { schoolCut, teacherCut } = computeCut(enr.pricePerSession, teacher.paymentMode, teacher.schoolCutValue);
            newPayments.push({
              id: uid(),
              studentId,
              enrollmentId: enr.id,
              sessionId: id,
              amount: enr.pricePerSession,
              status: "unpaid",
              month,
              schoolCut,
              teacherCut,
              reminderCount: 0,
            });
          }

          if (student?.linkedAccountId) {
            const label =
              stateVal === "present" ? "Présent" : stateVal === "absent_paid" ? "Absent (facturé)" : "Absent (gratuit)";
            newNotifs.push({
              id: uid(),
              userId: student.linkedAccountId,
              type: "attendance",
              message: `${student.name} a été marqué ${label}.`,
              read: false,
              createdAt: now(),
            });
          }
        }

        set((s) => ({
          sessions: [...s.sessions.filter((x) => x.id !== id), session],
          payments: [...s.payments, ...newPayments],
          notifications: [...newNotifs, ...s.notifications],
        }));
        fbWrite(COLLECTIONS.sessions, session);
        newPayments.forEach((p) => fbWrite(COLLECTIONS.payments, p));
        newNotifs.forEach((n) => fbWrite(COLLECTIONS.notifications, n));
        get().log(teacherId, "attendance.mark", `Présence enregistrée (${Object.keys(attendance).length} élèves)`);
      },

      // ---- Payments ----
      markPaid: (paymentId) => {
        const paidAt = now();
        set((s) => ({ payments: s.payments.map((p) => (p.id === paymentId ? { ...p, status: "paid", paidAt } : p)) }));
        fbPatch(COLLECTIONS.payments, paymentId, { status: "paid", paidAt });
        get().log("u_admin", "payment.mark_paid", "Paiement encaissé");
      },
      markUnpaid: (paymentId) => {
        set((s) => ({ payments: s.payments.map((p) => (p.id === paymentId ? { ...p, status: "unpaid", paidAt: undefined } : p)) }));
        fbPatch(COLLECTIONS.payments, paymentId, { status: "unpaid", paidAt: null });
      },
      // Mark every unpaid session of a student in a given month as paid at once (cahier UX).
      markMonthPaid: (studentId, month) => {
        const paidAt = now();
        const targets = get().payments.filter((p) => p.studentId === studentId && p.month === month && p.status === "unpaid");
        set((s) => ({
          payments: s.payments.map((p) =>
            p.studentId === studentId && p.month === month && p.status === "unpaid" ? { ...p, status: "paid", paidAt } : p
          ),
        }));
        targets.forEach((p) => fbPatch(COLLECTIONS.payments, p.id, { status: "paid", paidAt }));
        get().log("u_admin", "payment.mark_month_paid", `Mois ${month} encaissé (${targets.length} séances)`);
      },
      // Revert a whole month back to unpaid (uncheck).
      markMonthUnpaid: (studentId, month) => {
        const targets = get().payments.filter((p) => p.studentId === studentId && p.month === month && p.status === "paid");
        set((s) => ({
          payments: s.payments.map((p) =>
            p.studentId === studentId && p.month === month && p.status === "paid" ? { ...p, status: "unpaid", paidAt: undefined } : p
          ),
        }));
        targets.forEach((p) => fbPatch(COLLECTIONS.payments, p.id, { status: "unpaid", paidAt: null }));
      },
      sendReminder: (paymentId) => {
        const state = get();
        const payment = state.payments.find((p) => p.id === paymentId);
        if (!payment || payment.status === "paid") return;
        const student = state.students.find((s) => s.id === payment.studentId);
        const lastReminderAt = now();
        const reminderCount = payment.reminderCount + 1;
        const notif = student?.linkedAccountId
          ? {
              id: uid(),
              userId: student.linkedAccountId,
              type: "payment_reminder" as const,
              message: `Rappel : paiement en attente — ${payment.amount} DA.`,
              read: false,
              createdAt: now(),
            }
          : null;

        set((s) => ({
          payments: s.payments.map((p) => (p.id === paymentId ? { ...p, reminderCount, lastReminderAt } : p)),
          notifications: notif ? [notif, ...s.notifications] : s.notifications,
        }));
        fbPatch(COLLECTIONS.payments, paymentId, { reminderCount, lastReminderAt });
        if (notif) fbWrite(COLLECTIONS.notifications, notif);
      },

      // ---- Teacher payouts (school -> teacher) ----
      payTeacher: (teacherId, amount, month) => {
        const record: TeacherPayoutRecord = {
          id: uid(),
          teacherId,
          amount,
          month,
          paidAt: now(),
          confirmedByTeacher: false,
        };
        set((s) => ({ teacherPayouts: [record, ...s.teacherPayouts] }));
        fbWrite(COLLECTIONS.teacherPayouts, record);
        const teacher = get().teachers.find((t) => t.id === teacherId);
        const account = get().users.find((u) => u.teacherId === teacherId);
        if (account) {
          get().addNotification(account.id, "payment_reminder", `Paie reçue : ${amount} DA (${month}). Merci de confirmer.`);
        }
        get().log("u_admin", "teacher.pay", `Paie versée à ${teacher?.name ?? teacherId} : ${amount} DA`);
      },
      confirmPayout: (payoutId) => {
        const confirmedAt = now();
        set((s) => ({ teacherPayouts: s.teacherPayouts.map((p) => (p.id === payoutId ? { ...p, confirmedByTeacher: true, confirmedAt } : p)) }));
        fbPatch(COLLECTIONS.teacherPayouts, payoutId, { confirmedByTeacher: true, confirmedAt });
      },

      // ---- Notifications ----
      addNotification: (userId, type, message) => {
        const notif: AppNotification = { id: uid(), userId, type, message, read: false, createdAt: now() };
        set((s) => ({ notifications: [notif, ...s.notifications] }));
        fbWrite(COLLECTIONS.notifications, notif);
      },
      markNotificationRead: (id) => {
        set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
        fbPatch(COLLECTIONS.notifications, id, { read: true });
      },

      // ---- Slot requests ----
      resolveSlotRequest: (id, status) => {
        set((s) => ({ slotRequests: s.slotRequests.map((r) => (r.id === id ? { ...r, status } : r)) }));
        fbPatch(COLLECTIONS.slotRequests, id, { status });
      },
      // Teacher asks for a new slot; every admin is notified (cahier §5.3).
      addSlotRequest: (teacherId, subjectId, dayOfWeek, timeSlot) => {
        const state = get();
        const req: TeacherSlotRequest = { id: uid(), teacherId, subjectId, dayOfWeek, timeSlot, status: "pending", createdAt: now() };
        set((s) => ({ slotRequests: [req, ...s.slotRequests] }));
        fbWrite(COLLECTIONS.slotRequests, req);
        const teacherName = state.teachers.find((t) => t.id === teacherId)?.name ?? "Un enseignant";
        state.users
          .filter((u) => u.role === "admin")
          .forEach((admin) => get().addNotification(admin.id, "teacher_request", `${teacherName} demande un créneau : ${dayOfWeek} ${timeSlot}.`));
      },

      // ---- Waiting list (cahier §5.3) ----
      joinWaitlist: (classId, studentId) => {
        const klass = get().classes.find((c) => c.id === classId);
        if (!klass || (klass.waitingList ?? []).includes(studentId)) return;
        const waitingList = [...(klass.waitingList ?? []), studentId];
        set((s) => ({ classes: s.classes.map((c) => (c.id === classId ? { ...c, waitingList } : c)) }));
        fbPatch(COLLECTIONS.classes, classId, { waitingList });
      },
      leaveWaitlist: (classId, studentId) => {
        const klass = get().classes.find((c) => c.id === classId);
        if (!klass) return;
        const waitingList = (klass.waitingList ?? []).filter((id) => id !== studentId);
        set((s) => ({ classes: s.classes.map((c) => (c.id === classId ? { ...c, waitingList } : c)) }));
        fbPatch(COLLECTIONS.classes, classId, { waitingList });
      },

      // ---- Enrolment requests (تسجيل) ----
      // A student asks to study a subject with a chosen teacher. The request sits
      // in the admin's queue until several are grouped into one class.
      requestEnrollment: (studentId, subjectId, teacherId) => {
        const st = get();
        // Don't queue a duplicate, and don't queue if already enrolled with that pair.
        const dup = st.enrollmentRequests.some(
          (r) =>
            r.studentId === studentId &&
            r.subjectId === subjectId &&
            r.teacherId === teacherId &&
            r.status === "pending"
        );
        const already = st.enrollments.some(
          (e) => e.studentId === studentId && e.subjectId === subjectId && e.status === "active"
        );
        if (dup || already) return null;

        const req: EnrollmentRequest = {
          id: uid(),
          studentId,
          subjectId,
          teacherId,
          status: "pending",
          createdAt: now(),
        };
        set((s) => ({ enrollmentRequests: [req, ...s.enrollmentRequests] }));
        fbWrite(COLLECTIONS.enrollmentRequests, req);

        const student = st.students.find((x) => x.id === studentId);
        const subject = st.subjects.find((x) => x.id === subjectId);
        const teacher = st.teachers.find((x) => x.id === teacherId);
        // Tell every admin there is a new تسجيل waiting.
        st.users
          .filter((u) => u.role === "admin")
          .forEach((u) =>
            get().addNotification(
              u.id,
              "enrollment",
              `Nouvelle inscription : ${student?.name ?? "—"} — ${subject?.name ?? "—"} avec ${teacher?.name ?? "—"}`
            )
          );
        get().log(studentId, "enrollment_request", `${subject?.name ?? "—"} / ${teacher?.name ?? "—"}`);
        return req;
      },

      cancelEnrollmentRequest: (id) => {
        set((s) => ({ enrollmentRequests: s.enrollmentRequests.filter((r) => r.id !== id) }));
        fbDelete(COLLECTIONS.enrollmentRequests, id);
      },

      rejectEnrollmentRequest: (id) => {
        const req = get().enrollmentRequests.find((r) => r.id === id);
        if (!req) return;
        const patch = { status: "rejected" as const, reviewedAt: now() };
        set((s) => ({
          enrollmentRequests: s.enrollmentRequests.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }));
        fbPatch(COLLECTIONS.enrollmentRequests, id, patch);
        const student = get().students.find((x) => x.id === req.studentId);
        if (student?.linkedAccountId) {
          get().addNotification(student.linkedAccountId, "enrollment", "Votre demande d'inscription a été refusée.");
        }
      },

      // Turn pending requests into a real group: creates the class, enrols every
      // student in it, and stamps the price + school cut on the group itself.
      formGroupFromRequests: (requestIds, opts) => {
        const st = get();
        const reqs = st.enrollmentRequests.filter(
          (r) => requestIds.includes(r.id) && r.status === "pending"
        );
        if (reqs.length === 0) return null;

        // Every request in a group must share the same subject and teacher.
        const { subjectId, teacherId } = reqs[0];
        if (reqs.some((r) => r.subjectId !== subjectId || r.teacherId !== teacherId)) return null;

        const firstStudent = st.students.find((x) => x.id === reqs[0].studentId);
        const klass: ClassRoom = {
          id: uid(),
          subjectId,
          teacherId,
          roomId: opts.roomId,
          level: firstStudent?.level ?? "1am",
          sessionType: reqs.length > 1 ? "group" : "one_on_one",
          dayOfWeek: opts.dayOfWeek,
          timeSlot: opts.timeSlot,
          maxStudents: opts.maxStudents ?? Math.max(reqs.length, 8),
          currentStudents: reqs.length,
          isLocked: false,
          pricePerSession: opts.pricePerSession,
          schoolCutMode: opts.schoolCutMode,
          schoolCutValue: opts.schoolCutValue,
          createdAt: now(),
        };
        set((s) => ({ classes: [...s.classes, klass] }));
        fbWrite(COLLECTIONS.classes, klass);

        const enrolments: Enrollment[] = reqs.map((r) => ({
          id: uid(),
          studentId: r.studentId,
          classId: klass.id,
          subjectId,
          teacherId,
          pricePerSession: opts.pricePerSession,
          startDate: now(),
          status: "active",
        }));
        set((s) => ({ enrollments: [...s.enrollments, ...enrolments] }));
        enrolments.forEach((e) => fbWrite(COLLECTIONS.enrollments, e));

        const patch = { status: "grouped" as const, classId: klass.id, reviewedAt: now() };
        set((s) => ({
          enrollmentRequests: s.enrollmentRequests.map((r) =>
            requestIds.includes(r.id) ? { ...r, ...patch } : r
          ),
        }));
        reqs.forEach((r) => fbPatch(COLLECTIONS.enrollmentRequests, r.id, patch));

        // Keep the student's subject list in sync.
        reqs.forEach((r) => {
          const student = get().students.find((x) => x.id === r.studentId);
          if (student && !student.enrolledSubjects.includes(subjectId)) {
            get().updateStudent(student.id, {
              enrolledSubjects: [...student.enrolledSubjects, subjectId],
            });
          }
          if (student?.linkedAccountId) {
            get().addNotification(
              student.linkedAccountId,
              "enrollment",
              `Vous êtes inscrit(e) : ${opts.dayOfWeek} ${opts.timeSlot}`
            );
          }
        });

        const teacher = get().teachers.find((x) => x.id === teacherId);
        const teacherAccount = get().users.find((u) => u.teacherId === teacherId);
        if (teacherAccount) {
          get().addNotification(
            teacherAccount.id,
            "enrollment",
            `Nouveau groupe : ${reqs.length} élève(s), ${opts.dayOfWeek} ${opts.timeSlot}`
          );
        }
        get().log("admin", "form_group", `${teacher?.name ?? "—"} — ${reqs.length} élève(s)`);
        return klass;
      },

      // ---- Registration requests (student/teacher signup reviewed by admin) ----
      addRegistrationRequest: (req) => {
        const request: RegistrationRequest = { ...req, status: "pending", createdAt: now() };
        set((s) => ({ registrationRequests: [request, ...s.registrationRequests] }));
        fbWrite(COLLECTIONS.registrationRequests, request);
        get()
          .users.filter((u) => u.role === "admin")
          .forEach((a) =>
            get().addNotification(
              a.id,
              "teacher_request",
              `Nouvelle demande d'inscription : ${req.name} (${req.role === "teacher" ? "enseignant" : "étudiant"}).`
            )
          );
      },
      approveRegistration: (requestId) => {
        const state = get();
        const req = state.registrationRequests.find((r) => r.id === requestId);
        if (!req) return null;

        if (req.role === "student") {
          const student: Student = {
            id: uid(),
            name: req.name,
            level: req.level ?? "1as",
            phone: req.phone,
            parentName: req.parentName ?? "",
            parentPhone: req.parentPhone ?? "",
            status: "active",
            enrolledSubjects: [],
            linkedAccountId: req.id,
            createdAt: now(),
          };
          const user = { id: req.id, role: "student" as const, displayName: req.name, email: req.email, linkedStudentId: student.id, createdAt: now() };
          set((s) => ({ students: [...s.students, student], users: [...s.users.filter((u) => u.id !== req.id), user] }));
          fbWrite(COLLECTIONS.students, student);
          fbWrite(COLLECTIONS.users, user);
        } else {
          const teacher: Teacher = { id: uid(), name: req.name, phone: req.phone, subjects: req.subjects ?? [], paymentMode: "percentage", schoolCutValue: 25, createdAt: now() };
          const user = { id: req.id, role: "teacher" as const, displayName: req.name, email: req.email, teacherId: teacher.id, createdAt: now() };
          set((s) => ({ teachers: [...s.teachers, teacher], users: [...s.users.filter((u) => u.id !== req.id), user] }));
          fbWrite(COLLECTIONS.teachers, teacher);
          fbWrite(COLLECTIONS.users, user);
        }

        const reviewedAt = now();
        set((s) => ({ registrationRequests: s.registrationRequests.map((r) => (r.id === requestId ? { ...r, status: "approved", reviewedAt } : r)) }));
        fbPatch(COLLECTIONS.registrationRequests, requestId, { status: "approved", reviewedAt });
        get().log("u_admin", "registration.approve", `Inscription acceptée : ${req.name}`);
        return { email: req.email, name: req.name };
      },
      rejectRegistration: (requestId) => {
        const req = get().registrationRequests.find((r) => r.id === requestId);
        if (!req) return null;
        const reviewedAt = now();
        set((s) => ({ registrationRequests: s.registrationRequests.map((r) => (r.id === requestId ? { ...r, status: "rejected", reviewedAt } : r)) }));
        fbPatch(COLLECTIONS.registrationRequests, requestId, { status: "rejected", reviewedAt });
        get().log("u_admin", "registration.reject", `Inscription refusée : ${req.name}`);
        return { email: req.email, name: req.name };
      },

      resetToSeed: () => set({ ...makeSeed() }),

      loadDemoData: () => {
        const seed = makeSeed();
        set({ ...seed });
        // In Supabase mode these upserts flow through the offline outbox, so the
        // rows land in the database as well as the local store. Ids are fixed
        // (t1, s1, rm_big, ...) which is what DELETE-DEMO-DATA.sql keys off.
        fbWriteMany(COLLECTIONS.users, seed.users);
        fbWriteMany(COLLECTIONS.teachers, seed.teachers);
        fbWriteMany(COLLECTIONS.students, seed.students);
        fbWriteMany(COLLECTIONS.subjects, seed.subjects);
        fbWriteMany(COLLECTIONS.rooms, seed.rooms);
        fbWriteMany(COLLECTIONS.classes, seed.classes);
        fbWriteMany(COLLECTIONS.enrollments, seed.enrollments);
        fbWriteMany(COLLECTIONS.sessions, seed.sessions);
        fbWriteMany(COLLECTIONS.payments, seed.payments);
        fbWriteMany(COLLECTIONS.notifications, seed.notifications);
        fbWriteMany(COLLECTIONS.activityLog, seed.activityLog);
        fbWriteMany(COLLECTIONS.slotRequests, seed.slotRequests);
        fbWriteMany(COLLECTIONS.registrationRequests, seed.registrationRequests);
        fbWriteMany(COLLECTIONS.enrollmentRequests, seed.enrollmentRequests);
      },
    }),
    {
      name: "horizon-store",
      version: 1,
      // Persist to localStorage only in DEMO_MODE; Firebase mode is backed by Firestore.
      storage: createJSONStorage(() => (DEMO_MODE ? localStorage : noopStorage)),
      partialize: (s) => ({
        users: s.users,
        students: s.students,
        teachers: s.teachers,
        subjects: s.subjects,
        rooms: s.rooms,
        classes: s.classes,
        enrollments: s.enrollments,
        sessions: s.sessions,
        payments: s.payments,
        notifications: s.notifications,
        activityLog: s.activityLog,
        slotRequests: s.slotRequests,
        registrationRequests: s.registrationRequests,
        teacherPayouts: s.teacherPayouts,
        enrollmentRequests: s.enrollmentRequests,
      }),
    }
  )
);

export function roleHomeUser(role: Role, users: DataState["users"]) {
  return users.find((u) => u.role === role);
}

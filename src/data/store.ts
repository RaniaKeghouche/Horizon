// Local application store (Zustand + localStorage), seeded with demo data.
// This is the single source of truth in DEMO_MODE. When Firebase is wired in, a sync
// layer can mirror Firestore snapshots into this same shape — components won't change.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { makeSeed } from "./seed";
import { computeCut, isBillable } from "../lib/payments";
import { billingMonth } from "../lib/format";
import type {
  ActivityLog,
  AppNotification,
  ClassRoom,
  Enrollment,
  Payment,
  Role,
  Session,
  Student,
  Subject,
  Teacher,
  TeacherSlotRequest,
} from "../lib/types";

const uid = () => crypto.randomUUID();
const now = () => Date.now();

interface DataState {
  users: ReturnType<typeof makeSeed>["users"];
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

  // ---- Activity log ----
  log: (userId: string, action: string, details: string) => void;

  // ---- Subjects ----
  addSubject: (name: string) => void;
  deleteSubject: (id: string) => void;

  // ---- Students ----
  addStudent: (data: Omit<Student, "id" | "createdAt" | "enrolledSubjects" | "status"> & { status?: Student["status"] }) => Student;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  deleteStudent: (id: string) => void;

  // ---- Teachers ----
  addTeacher: (data: Omit<Teacher, "id" | "createdAt">) => Teacher;
  updateTeacher: (id: string, patch: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;

  // ---- Classes ----
  addClass: (data: Omit<ClassRoom, "id" | "createdAt" | "currentStudents" | "isLocked">) => ClassRoom;
  updateClass: (id: string, patch: Partial<ClassRoom>) => void;
  deleteClass: (id: string) => void;

  // ---- Enrollment ----
  enroll: (studentId: string, classId: string, pricePerSession: number) => void;
  unenroll: (enrollmentId: string) => void;

  // ---- Attendance / sessions ----
  saveAttendance: (
    classId: string,
    teacherId: string,
    date: number,
    attendance: Record<string, Session["attendance"][string]>,
    notes?: string,
    sessionId?: string
  ) => void;

  // ---- Payments ----
  markPaid: (paymentId: string) => void;
  markUnpaid: (paymentId: string) => void;
  sendReminder: (paymentId: string) => void;

  // ---- Notifications ----
  addNotification: (userId: string, type: AppNotification["type"], message: string) => void;
  markNotificationRead: (id: string) => void;

  // ---- Slot requests ----
  resolveSlotRequest: (id: string, status: "approved" | "rejected") => void;

  // ---- Maintenance ----
  resetToSeed: () => void;
}

export const useData = create<DataState>()(
  persist(
    (set, get) => ({
      ...makeSeed(),

      log: (userId, action, details) =>
        set((s) => ({
          activityLog: [
            { id: uid(), userId, action, details, createdAt: now() },
            ...s.activityLog,
          ],
        })),

      // ---- Subjects ----
      addSubject: (name) =>
        set((s) => ({
          subjects: [...s.subjects, { id: uid(), name, isCustom: true, createdAt: now() }],
        })),
      deleteSubject: (id) => set((s) => ({ subjects: s.subjects.filter((x) => x.id !== id) })),

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
        get().log("u_admin", "student.create", `Ajout de l'étudiant ${student.name}`);
        return student;
      },
      updateStudent: (id, patch) =>
        set((s) => ({ students: s.students.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteStudent: (id) =>
        set((s) => ({
          students: s.students.filter((x) => x.id !== id),
          enrollments: s.enrollments.filter((e) => e.studentId !== id),
        })),

      // ---- Teachers ----
      addTeacher: (data) => {
        const teacher: Teacher = { id: uid(), createdAt: now(), ...data };
        set((s) => ({ teachers: [...s.teachers, teacher] }));
        get().log("u_admin", "teacher.create", `Ajout de l'enseignant ${teacher.name}`);
        return teacher;
      },
      updateTeacher: (id, patch) =>
        set((s) => ({ teachers: s.teachers.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteTeacher: (id) => set((s) => ({ teachers: s.teachers.filter((x) => x.id !== id) })),

      // ---- Classes ----
      addClass: (data) => {
        const klass: ClassRoom = {
          id: uid(),
          createdAt: now(),
          currentStudents: 0,
          isLocked: false,
          ...data,
        };
        set((s) => ({ classes: [...s.classes, klass] }));
        get().log("u_admin", "class.create", `Nouvelle classe ${data.timeSlot}`);
        return klass;
      },
      updateClass: (id, patch) =>
        set((s) => ({ classes: s.classes.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteClass: (id) =>
        set((s) => ({
          classes: s.classes.filter((x) => x.id !== id),
          enrollments: s.enrollments.filter((e) => e.classId !== id),
        })),

      // ---- Enrollment (cahier §6.2) ----
      enroll: (studentId, classId, pricePerSession) => {
        const state = get();
        const klass = state.classes.find((c) => c.id === classId);
        const student = state.students.find((s) => s.id === studentId);
        if (!klass || !student) return;
        if (state.enrollments.some((e) => e.studentId === studentId && e.classId === classId)) return;

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
        set((s) => ({
          enrollments: [...s.enrollments, enrollment],
          classes: s.classes.map((c) =>
            c.id === classId
              ? { ...c, currentStudents: nextCount, isLocked: nextCount >= c.maxStudents }
              : c
          ),
          students: s.students.map((st) =>
            st.id === studentId && !st.enrolledSubjects.includes(klass.subjectId)
              ? { ...st, enrolledSubjects: [...st.enrolledSubjects, klass.subjectId] }
              : st
          ),
        }));
        get().log("u_admin", "enroll", `${student.name} inscrit à une classe`);
      },
      unenroll: (enrollmentId) =>
        set((s) => {
          const enr = s.enrollments.find((e) => e.id === enrollmentId);
          if (!enr) return {};
          return {
            enrollments: s.enrollments.filter((e) => e.id !== enrollmentId),
            classes: s.classes.map((c) =>
              c.id === enr.classId
                ? {
                    ...c,
                    currentStudents: Math.max(0, c.currentStudents - 1),
                    isLocked: false,
                  }
                : c
            ),
          };
        }),

      // ---- Attendance (cahier §4) ----
      // Saving attendance also generates unpaid Payment rows for billable states,
      // and notifies each affected student/parent account.
      saveAttendance: (classId, teacherId, date, attendance, notes, sessionId) => {
        const state = get();
        const klass = state.classes.find((c) => c.id === classId);
        if (!klass) return;
        const teacher = state.teachers.find((t) => t.id === teacherId);

        const id = sessionId ?? uid();
        const session: Session = {
          id,
          classId,
          teacherId,
          date,
          notes,
          attendance,
        };

        const newPayments: Payment[] = [];
        const newNotifs: AppNotification[] = [];
        const month = billingMonth(new Date(date));

        for (const [studentId, stateVal] of Object.entries(attendance)) {
          const enr = state.enrollments.find(
            (e) => e.studentId === studentId && e.classId === classId
          );
          const student = state.students.find((s) => s.id === studentId);

          // Bill only present / absent-paid, and only if not already billed for this session.
          if (
            enr &&
            teacher &&
            isBillable(stateVal) &&
            !state.payments.some((p) => p.enrollmentId === enr.id && p.sessionId === id)
          ) {
            const { schoolCut, teacherCut } = computeCut(
              enr.pricePerSession,
              teacher.paymentMode,
              teacher.schoolCutValue
            );
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

          // Notify the linked student/parent account.
          if (student?.linkedAccountId) {
            const label =
              stateVal === "present"
                ? "Présent"
                : stateVal === "absent_paid"
                ? "Absent (facturé)"
                : "Absent (gratuit)";
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
        get().log(teacherId, "attendance.mark", `Présence enregistrée (${Object.keys(attendance).length} élèves)`);
      },

      // ---- Payments ----
      markPaid: (paymentId) => {
        set((s) => ({
          payments: s.payments.map((p) =>
            p.id === paymentId ? { ...p, status: "paid", paidAt: now() } : p
          ),
        }));
        get().log("u_admin", "payment.mark_paid", `Paiement encaissé`);
      },
      markUnpaid: (paymentId) =>
        set((s) => ({
          payments: s.payments.map((p) =>
            p.id === paymentId ? { ...p, status: "unpaid", paidAt: undefined } : p
          ),
        })),
      // Automated reminder (cahier §3.6): bumps counter + notifies parent in-app.
      sendReminder: (paymentId) => {
        const state = get();
        const payment = state.payments.find((p) => p.id === paymentId);
        if (!payment || payment.status === "paid") return;
        const student = state.students.find((s) => s.id === payment.studentId);
        set((s) => ({
          payments: s.payments.map((p) =>
            p.id === paymentId
              ? { ...p, reminderCount: p.reminderCount + 1, lastReminderAt: now() }
              : p
          ),
          notifications: student?.linkedAccountId
            ? [
                {
                  id: uid(),
                  userId: student.linkedAccountId,
                  type: "payment_reminder" as const,
                  message: `Rappel : paiement en attente — ${payment.amount} DA.`,
                  read: false,
                  createdAt: now(),
                },
                ...s.notifications,
              ]
            : s.notifications,
        }));
      },

      // ---- Notifications ----
      addNotification: (userId, type, message) =>
        set((s) => ({
          notifications: [
            { id: uid(), userId, type, message, read: false, createdAt: now() },
            ...s.notifications,
          ],
        })),
      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),

      // ---- Slot requests ----
      resolveSlotRequest: (id, status) =>
        set((s) => ({
          slotRequests: s.slotRequests.map((r) => (r.id === id ? { ...r, status } : r)),
        })),

      resetToSeed: () => set({ ...makeSeed() }),
    }),
    {
      name: "horizon-store",
      version: 1,
      // Persist only data, not the action functions.
      partialize: (s) => ({
        users: s.users,
        students: s.students,
        teachers: s.teachers,
        subjects: s.subjects,
        classes: s.classes,
        enrollments: s.enrollments,
        sessions: s.sessions,
        payments: s.payments,
        notifications: s.notifications,
        activityLog: s.activityLog,
        slotRequests: s.slotRequests,
      }),
    }
  )
);

// Convenience lookups (used across features).
export function roleHomeUser(role: Role, users: DataState["users"]) {
  return users.find((u) => u.role === role);
}

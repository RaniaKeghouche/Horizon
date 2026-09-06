// Application store (Zustand). Two modes:
//  - DEMO_MODE: seeded local data persisted to localStorage (no backend).
//  - Firebase mode: starts empty; firebaseSync mirrors Firestore into it in real time,
//    and each action also writes to Firestore via the fb.* helpers.
// Components read/write through this store and never change between modes.
import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { makeSeed } from "./seed";
import { fbWrite, fbPatch, fbDelete, fbWriteMany } from "./fb";
import { callRpc } from "./rpc";
import { dropQueued } from "./outbox";
import { DEMO_MODE } from "../lib/config";
import { computeCut, isBillable, defaultPrice } from "../lib/payments";
import { billingMonth, formatDA, isoDate } from "../lib/format";
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

  log: (
    userId: string,
    action: string,
    details: string,
    msgKey?: string,
    msgParams?: Record<string, string | number>
  ) => void;

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
  /** L'eleve s'inscrit lui-meme. Asynchrone : la base a le dernier mot sur la
   *  place disponible, et l'inscription est annulee localement si elle refuse. */
  selfEnroll: (studentId: string, classId: string) => Promise<boolean>;
  adminAssign: (studentId: string, classId: string, price: number) => void; // admin enrolls; student notified
  moveStudent: (enrollmentId: string, newClassId: string) => void; // admin moves group; student notified

  saveAttendance: (
    classId: string,
    teacherId: string,
    date: number,
    attendance: Record<string, Session["attendance"][string]>,
    notes?: string,
    sessionId?: string,
    /** Seance supplementaire (rattrapage, revision) : elle s'ajoute au creneau
     *  hebdomadaire au lieu de le remplacer, donc plusieurs peuvent tomber le
     *  meme jour. */
    isExtra?: boolean
  ) => void;

  markPaid: (paymentId: string, note?: string) => void;
  /** Encaisser PLUSIEURS factures en un seul geste (un cycle, par exemple).
   *  La famille recoit UN accuse portant le total, pas un par ligne. */
  markPaidMany: (paymentIds: string[], note?: string) => void;
  markUnpaid: (paymentId: string) => void;
  markMonthPaid: (studentId: string, month: string) => void;
  markMonthUnpaid: (studentId: string, month: string) => void;
  sendReminder: (paymentId: string) => void;

  // Teacher payouts (school -> teacher)
  payTeacher: (teacherId: string, amount: number, month: string) => void;
  confirmPayout: (payoutId: string) => void;

  /** `message` reste le texte francais (sauvegarde Sheets, lignes anciennes) ;
   *  `msgKey`/`msgParams` permettent de l'afficher dans la langue du lecteur. */
  addNotification: (
    userId: string,
    type: AppNotification["type"],
    message: string,
    msgKey?: string,
    msgParams?: Record<string, string | number>
  ) => void;
  markNotificationRead: (id: string) => void;

  resolveSlotRequest: (id: string, status: "approved" | "rejected") => void;
  addSlotRequest: (teacherId: string, subjectId: string | undefined, dayOfWeek: TeacherSlotRequest["dayOfWeek"], timeSlot: string) => void;

  joinWaitlist: (classId: string, studentId: string) => void;
  leaveWaitlist: (classId: string, studentId: string) => void;

  /** Reservation d'un candidat encore en attente de validation. Bascule le
   *  groupe dans/hors de sa liste d'envies ; renvoie l'etat obtenu. */
  toggleWantedClass: (requestId: string, classId: string) => boolean;

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

/**
 * Renumerote les seances ordinaires d'un groupe dans l'ordre des dates.
 *
 * Le numero etait auparavant « le nombre de seances existantes + 1 », donc
 * l'ordre de SAISIE. Rattraper une seance oubliee du mois dernier lui donnait
 * un numero superieur a celles qui l'ont suivie, et une seance supplementaire
 * consommait un numero au passage. Le numero est une position dans le
 * calendrier du groupe : il se deduit des dates.
 *
 * Les seances supplementaires n'en recoivent pas — elles s'affichent comme
 * « supplementaire » et non « seance n° ».
 */
function renumberSessions(all: Session[], classId: string): Session[] {
  const rank = new Map<string, number>();
  all
    .filter((s) => s.classId === classId && !s.isExtra)
    .sort((a, b) => a.date - b.date || a.id.localeCompare(b.id))
    .forEach((s, i) => rank.set(s.id, i + 1));

  return all.map((s) => {
    if (s.classId !== classId) return s;
    const want = s.isExtra ? undefined : rank.get(s.id);
    return s.sessionNumber === want ? s : { ...s, sessionNumber: want };
  });
}

export const useData = create<DataState>()(
  persist(
    (set, get) => ({
      ...(DEMO_MODE ? makeSeed() : EMPTY()),

      log: (userId, action, details, msgKey, msgParams) => {
        const entry: ActivityLog = {
          id: uid(), userId, action, details, createdAt: now(),
          ...(msgKey ? { msgKey } : {}),
          ...(msgParams ? { msgParams } : {}),
        };
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
        get().log("u_admin", "student.create", `Ajout de l'étudiant ${student.name}`,
          "act.d_student_create", { name: student.name });
        return student;
      },
      updateStudent: (id, patch) => {
        set((s) => ({ students: s.students.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
        fbPatch(COLLECTIONS.students, id, patch);
      },
      deleteStudent: (id) => {
        const state = get();
        const removed = state.enrollments.filter((e) => e.studentId === id);
        // Les places doivent revenir aux groupes. Sans ce recalcul, `enroll`
        // continuait de voir le groupe plein : la place liberee etait perdue
        // pour de bon, et `isLocked` reste a true — plus personne, ni
        // l'administration ni l'eleve, ne pouvait la reprendre.
        const touched = [...new Set(removed.map((e) => e.classId))];
        const restant = (classId: string) =>
          state.enrollments.filter((e) => e.classId === classId && e.studentId !== id).length;

        set((s) => ({
          students: s.students.filter((x) => x.id !== id),
          enrollments: s.enrollments.filter((e) => e.studentId !== id),
          classes: s.classes.map((c) =>
            touched.includes(c.id)
              ? { ...c, currentStudents: restant(c.id), isLocked: restant(c.id) >= c.maxStudents }
              : c
          ),
        }));
        fbDelete(COLLECTIONS.students, id);
        removed.forEach((e) => fbDelete(COLLECTIONS.enrollments, e.id));
        for (const classId of touched) {
          const c = state.classes.find((x) => x.id === classId);
          if (!c) continue;
          fbPatch(COLLECTIONS.classes, classId, {
            currentStudents: restant(classId),
            isLocked: restant(classId) >= c.maxStudents,
          });
        }
      },

      // ---- Teachers ----
      addTeacher: (data) => {
        const teacher: Teacher = { id: uid(), createdAt: now(), ...data };
        set((s) => ({ teachers: [...s.teachers, teacher] }));
        fbWrite(COLLECTIONS.teachers, teacher);
        get().log("u_admin", "teacher.create", `Ajout de l'enseignant ${teacher.name}`,
          "act.d_teacher_create", { name: teacher.name });
        return teacher;
      },
      updateTeacher: (id, patch) => {
        set((s) => ({ teachers: s.teachers.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
        fbPatch(COLLECTIONS.teachers, id, patch);
      },
      deleteTeacher: (id) => {
        // Meme regle que pour une matiere en service : on refuse plutot que de
        // laisser des groupes pointer vers un enseignant qui n'existe plus.
        // L'interface desactive deja le bouton ; cette garde tient l'invariant
        // quel que soit l'appelant.
        if (get().classes.some((c) => c.teacherId === id)) return;
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
          get().addNotification(account.id, "teacher_request",
            `Nouveau créneau qui vous est assigné : ${subj} · ${DAY_LABEL[data.dayOfWeek]} ${data.timeSlot}.`,
            "notif.slot_assigned", { subject: subj, day: data.dayOfWeek, slot: data.timeSlot });
        }
        get().log("u_admin", "class.create", `Nouvelle classe ${data.timeSlot}`,
          "act.d_class_create", { slot: data.timeSlot });
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
            get().addNotification(
              account.id, "teacher_request", msg,
              changedTeacher ? "notif.slot_reassigned" : "notif.slot_changed",
              { subject: subj, day: merged.dayOfWeek, slot: merged.timeSlot }
            );
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
        get().log("u_admin", "enroll", `${student.name} inscrit à une classe`,
          "act.d_enroll", { name: student.name });
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
            get().addNotification(waited.linkedAccountId, "waiting_list",
              `Une place s'est libérée dans une de vos classes en attente.`, "notif.seat_freed");
          }
          state.users
            .filter((u) => u.role === "admin")
            .forEach((admin) => get().addNotification(admin.id, "waiting_list",
              `Place libérée : ${waited?.name ?? "un élève"} peut être inscrit (liste d'attente).`,
              "notif.seat_freed_admin", { name: waited?.name ?? "—" }));
        }
      },

      // Un compte en attente n'a pas de fiche eleve, donc pas d'inscription
      // possible : sa selection est gardee sur sa demande d'inscription et
      // convertie en vraies inscriptions le jour de la validation.
      toggleWantedClass: (requestId, classId) => {
        const req = get().registrationRequests.find((r) => r.id === requestId);
        if (!req) return false;
        const current = req.wantedClassIds ?? [];
        const wanted = current.includes(classId)
          ? current.filter((id) => id !== classId)
          : [...current, classId];
        set((s) => ({
          registrationRequests: s.registrationRequests.map((r) =>
            r.id === requestId ? { ...r, wantedClassIds: wanted } : r
          ),
        }));
        fbPatch(COLLECTIONS.registrationRequests, requestId, { wantedClassIds: wanted });
        return wanted.includes(classId);
      },

      /**
       * L'eleve s'inscrit lui-meme a un groupe.
       *
       * Les regles de la base reservent a l'administration l'ecriture dans
       * `enrollments` et la mise a jour de `classes` : les deux ecritures
       * lancees par enroll() etaient donc refusees, la file d'attente les
       * abandonnait, et l'inscription — bien visible a l'ecran — n'existait
       * nulle part. Elle passe maintenant par la fonction self_enroll(), qui
       * fait le travail cote serveur en une transaction (place, niveau,
       * doublon, compteur du groupe).
       *
       * L'ecriture locale reste immediate pour que l'interface reponde tout de
       * suite, mais elle est ANNULEE si la base refuse : mieux vaut voir le
       * bouton revenir que croire a une inscription qui n'a pas eu lieu.
       */
      selfEnroll: async (studentId, classId) => {
        const state = get();
        const klass = state.classes.find((c) => c.id === classId);
        const student = state.students.find((s) => s.id === studentId);
        if (!klass || !student) return false;

        const before = {
          enrollments: state.enrollments,
          classes: state.classes,
          students: state.students,
        };
        // Le prix du groupe fait foi : l'administration l'a fixe a la creation,
        // et c'est celui que le catalogue affiche a l'eleve. `defaultPrice` ne
        // renvoie un tarif que pour les groupes ordinaires — pour un cours
        // particulier ou un groupe special elle rend `null`, et le repli code en
        // dur facturait alors 2 000 DA au lieu du prix annonce.
        get().enroll(
          studentId,
          classId,
          klass.pricePerSession || defaultPrice(klass.sessionType, klass.level) || 2000
        );
        const added = get().enrollments.find(
          (e) => e.studentId === studentId && e.classId === classId
        );
        if (!added) return false; // deja inscrit, ou groupe complet localement

        if (!DEMO_MODE) {
          // enroll() a mis les deux ecritures dans la file : elles seraient
          // refusees. On les retire et on laisse la fonction en base faire foi.
          dropQueued(COLLECTIONS.enrollments, added.id);
          dropQueued(COLLECTIONS.classes, classId);

          const res = await callRpc<Enrollment>("self_enroll", { p_class_id: classId });
          if (!res.ok) {
            set(before); // la base a refuse : on remet l'ecran dans son etat
            return false;
          }
          // La base a pu attribuer un autre identifiant : on adopte le sien
          // pour que les paiements et l'appel s'y rattachent correctement.
          if (res.data?.id && res.data.id !== added.id) {
            const real = res.data;
            set((s) => ({
              enrollments: s.enrollments.map((e) => (e.id === added.id ? { ...e, ...real } : e)),
            }));
          }
        }

        const subj = state.subjects.find((s) => s.id === klass.subjectId)?.name ?? "un cours";
        state.users
          .filter((u) => u.role === "admin")
          .forEach((a) =>
            get().addNotification(
              a.id,
              "enrollment",
              `${student.name} s'est inscrit(e) au groupe ${subj} (${klass.timeSlot}).`,
              "notif.self_enrolled",
              { name: student.name, subject: subj, slot: klass.timeSlot }
            )
          );
        return true;
      },

      // Admin assigns a student to a group → the student is notified.
      adminAssign: (studentId, classId, price) => {
        get().enroll(studentId, classId, price);
        const state = get();
        const student = state.students.find((s) => s.id === studentId);
        const klass = state.classes.find((c) => c.id === classId);
        if (student?.linkedAccountId && klass && get().enrollments.some((e) => e.studentId === studentId && e.classId === classId)) {
          const subj = state.subjects.find((s) => s.id === klass.subjectId)?.name ?? "un cours";
          get().addNotification(student.linkedAccountId, "enrollment",
            `Vous avez été affecté(e) au groupe ${subj} (${klass.timeSlot}).`,
            "notif.assigned", { subject: subj, slot: klass.timeSlot });
        }
      },

      // Admin moves a student from one group to another → the student is notified.
      moveStudent: (enrollmentId, newClassId) => {
        const state = get();
        const enr = state.enrollments.find((e) => e.id === enrollmentId);
        const newClass = state.classes.find((c) => c.id === newClassId);
        if (!enr || !newClass) return;
        const student = state.students.find((s) => s.id === enr.studentId);
        const price =
          newClass.pricePerSession ||
          defaultPrice(newClass.sessionType, newClass.level) ||
          enr.pricePerSession;
        get().unenroll(enrollmentId);
        get().enroll(enr.studentId, newClassId, price);
        if (student?.linkedAccountId && get().enrollments.some((e) => e.studentId === enr.studentId && e.classId === newClassId)) {
          const subj = state.subjects.find((s) => s.id === newClass.subjectId)?.name ?? "un cours";
          get().addNotification(student.linkedAccountId, "enrollment",
            `Vous avez été déplacé(e) vers le groupe ${subj} (${newClass.timeSlot}).`,
            "notif.moved", { subject: subj, slot: newClass.timeSlot });
        }
      },

      // ---- Attendance (cahier §4) ----
      saveAttendance: (classId, teacherId, date, attendance, notes, sessionId, isExtra) => {
        const state = get();
        const klass = state.classes.find((c) => c.id === classId);
        if (!klass) return;
        const teacher = state.teachers.find((t) => t.id === teacherId);

        // Une seance par groupe et par date : si aucune n'est designee mais qu'il
        // en existe deja une ce jour-la, on la CORRIGE au lieu d'en ouvrir une
        // seconde. La regle vivait uniquement dans l'ecran d'appel, qui la
        // deduisait de ce qu'il avait deja recu ; en mode Supabase, une seance
        // pas encore synchronisee ou deux appareils simultanes creaient un
        // doublon — donc une seconde facturation de la meme lecon.
        // Une seance supplementaire echappe a la regle : c'est sa raison d'etre.
        const sameDay = (t: number) => isoDate(new Date(t)) === isoDate(new Date(date));
        const id =
          sessionId ??
          (isExtra
            ? uid()
            : state.sessions.find((s) => s.classId === classId && !s.isExtra && sameDay(s.date))?.id ??
              uid());
        const existing = state.sessions.find((s) => s.id === id);
        // On garde le drapeau d'une seance deja enregistree : la corriger ne doit
        // pas la transformer en seance ordinaire.
        const extra = isExtra ?? existing?.isExtra;
        const session: Session = { id, classId, teacherId, date, notes, attendance, ...(extra ? { isExtra: true } : {}) };

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

          // Ne prevenir que si le pointage a REELLEMENT change. Sans cette
          // comparaison, corriger une faute de frappe dans la note renvoyait
          // une alerte a chaque parent, pour un pointage identique.
          const wasVal = existing?.attendance[studentId];
          if (student?.linkedAccountId && wasVal !== stateVal) {
            const label =
              stateVal === "present" ? "Présent" : stateVal === "absent_paid" ? "Absent (facturé)" : "Absent (gratuit)";
            newNotifs.push({
              id: uid(),
              userId: student.linkedAccountId,
              type: "attendance",
              message: `${student.name} a été marqué ${label}.`,
              msgKey: "notif.attendance",
              msgParams: { name: student.name, state: stateVal },
              read: false,
              createdAt: now(),
            });
          }
        }

        // Editing a session can turn a billable mark into a non-billable one (or
        // drop a student from it). The charge for that session no longer applies,
        // so remove it — but only while it is still UNPAID: money already taken
        // is history and must never vanish.
        const staleIds = state.payments
          .filter(
            (p) =>
              p.sessionId === id &&
              p.status === "unpaid" &&
              !isBillable(attendance[p.studentId] ?? "absent_free")
          )
          .map((p) => p.id);

        // Les numeros suivent la chronologie, pas l'ordre de saisie : rattraper
        // une seance oubliee la remet a sa vraie place au lieu de lui donner le
        // numero suivant. Les seances supplementaires ne consomment pas de
        // numero — elles s'affichent comme « supplementaire ».
        const merged = [...state.sessions.filter((x) => x.id !== id), session];
        const renumbered = renumberSessions(merged, classId);
        const changed = renumbered.filter((x) => {
          const was = merged.find((m) => m.id === x.id);
          return was && was.sessionNumber !== x.sessionNumber;
        });

        set((s) => ({
          sessions: renumberSessions([...s.sessions.filter((x) => x.id !== id), session], classId),
          payments: [...s.payments.filter((p) => !staleIds.includes(p.id)), ...newPayments],
          notifications: [...newNotifs, ...s.notifications],
        }));
        fbWrite(COLLECTIONS.sessions, renumbered.find((x) => x.id === id) ?? session);
        // Seules les seances dont le numero a bouge sont reecrites.
        changed
          .filter((x) => x.id !== id)
          .forEach((x) => fbPatch(COLLECTIONS.sessions, x.id, { sessionNumber: x.sessionNumber }));
        staleIds.forEach((pid) => fbDelete(COLLECTIONS.payments, pid));
        newPayments.forEach((p) => fbWrite(COLLECTIONS.payments, p));
        newNotifs.forEach((n) => fbWrite(COLLECTIONS.notifications, n));
        get().log(teacherId, "attendance.mark", `Présence enregistrée (${Object.keys(attendance).length} élèves)`,
          "act.d_attendance_mark", { n: Object.keys(attendance).length });
      },

      // ---- Payments ----
      markPaid: (paymentId, note) => {
        const paidAt = now();
        set((s) => ({
          payments: s.payments.map((p) =>
            p.id === paymentId ? { ...p, status: "paid", paidAt, note: note ?? p.note } : p
          ),
        }));
        fbPatch(COLLECTIONS.payments, paymentId, { status: "paid", paidAt, ...(note ? { note } : {}) });
        // Also written to the journal: if the `note` column is missing on an
        // un-migrated database the row's note would be dropped, but the audit
        // trail keeps it either way.
        const p = get().payments.find((x) => x.id === paymentId);
        const who = get().students.find((x) => x.id === p?.studentId)?.name ?? "";
        get().log(
          "u_admin",
          "payment.mark_paid",
          `Paiement encaissé${who ? ` — ${who}` : ""}${note ? ` · ${note}` : ""}`,
          "act.d_payment_mark_paid",
          { name: who || "—" }
        );
        // La famille est prevenue de l'encaissement. Sans cet accuse, un paiement
        // regle au comptoir ne laissait aucune trace visible cote eleve : le
        // reglement n'apparaissait que dans un solde, jamais comme evenement.
        const student = get().students.find((x) => x.id === p?.studentId);
        if (student?.linkedAccountId && p) {
          get().addNotification(
            student.linkedAccountId,
            "payment_reminder",
            `Paiement reçu : ${p.amount} DA. Merci.`,
            "notif.payment_received",
            { amount: p.amount }
          );
        }
      },
      // Un encaissement porte sur un cycle entier : le marquer facture par
      // facture envoyait autant d'accuses identiques a la famille. On regroupe
      // par eleve et on n'en envoie qu'un, portant le total reellement encaisse.
      markPaidMany: (paymentIds, note) => {
        const paidAt = now();
        const state = get();
        const cibles = state.payments.filter(
          (p) => paymentIds.includes(p.id) && p.status === "unpaid"
        );
        if (cibles.length === 0) return;

        set((s) => ({
          payments: s.payments.map((p) =>
            cibles.some((c) => c.id === p.id)
              ? { ...p, status: "paid" as const, paidAt, note: note ?? p.note }
              : p
          ),
        }));
        cibles.forEach((p) =>
          fbPatch(COLLECTIONS.payments, p.id, { status: "paid", paidAt, ...(note ? { note } : {}) })
        );

        const parEleve = new Map<string, number>();
        for (const p of cibles) parEleve.set(p.studentId, (parEleve.get(p.studentId) ?? 0) + p.amount);
        for (const [studentId, total] of parEleve) {
          const who = state.students.find((x) => x.id === studentId);
          get().log(
            "u_admin",
            "payment.mark_paid",
            `Paiement encaissé — ${who?.name ?? "—"}${note ? ` · ${note}` : ""}`,
            "act.d_payment_mark_paid",
            { name: who?.name ?? "—" }
          );
          if (who?.linkedAccountId) {
            get().addNotification(
              who.linkedAccountId,
              "payment_reminder",
              `Paiement reçu : ${total} DA. Merci.`,
              "notif.payment_received",
              { amount: total }
            );
          }
        }
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
        get().log("u_admin", "payment.mark_month_paid", `Mois ${month} encaissé (${targets.length} séances)`,
          "act.d_payment_mark_month_paid", { month, n: targets.length });
        // Encaisser un mois entier ne prevenait personne : la famille ne voyait
        // le reglement que dans un solde, jamais comme evenement.
        const total = targets.reduce((sum, p) => sum + p.amount, 0);
        const who = get().students.find((x) => x.id === studentId);
        if (who?.linkedAccountId && total > 0) {
          get().addNotification(
            who.linkedAccountId,
            "payment_reminder",
            `Paiement reçu : ${total} DA. Merci.`,
            "notif.payment_received",
            { amount: total }
          );
        }
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
              msgKey: "notif.payment_reminder",
              msgParams: { amount: payment.amount },
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
          get().addNotification(account.id, "payment_reminder",
            `Paie reçue : ${amount} DA (${month}). Merci de confirmer.`,
            "notif.payout_sent", { amount, month });
        }
        get().log("u_admin", "teacher.pay", `Paie versée à ${teacher?.name ?? teacherId} : ${amount} DA`,
          "act.d_teacher_pay", { name: teacher?.name ?? teacherId, amount: formatDA(amount) });
      },
      confirmPayout: (payoutId) => {
        const confirmedAt = now();
        set((s) => ({ teacherPayouts: s.teacherPayouts.map((p) => (p.id === payoutId ? { ...p, confirmedByTeacher: true, confirmedAt } : p)) }));
        fbPatch(COLLECTIONS.teacherPayouts, payoutId, { confirmedByTeacher: true, confirmedAt });
      },

      // ---- Notifications ----
      addNotification: (userId, type, message, msgKey, msgParams) => {
        const notif: AppNotification = {
          id: uid(), userId, type, message, read: false, createdAt: now(),
          ...(msgKey ? { msgKey } : {}),
          ...(msgParams ? { msgParams } : {}),
        };
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
          .forEach((admin) => get().addNotification(admin.id, "teacher_request",
            `${teacherName} demande un créneau : ${DAY_LABEL[dayOfWeek]} ${timeSlot}.`,
            "notif.slot_request", { teacher: teacherName, day: dayOfWeek, slot: timeSlot }));
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
              `Nouvelle inscription : ${student?.name ?? "—"} — ${subject?.name ?? "—"} avec ${teacher?.name ?? "—"}`,
              "notif.enrollment_request",
              { student: student?.name ?? "—", subject: subject?.name ?? "—", teacher: teacher?.name ?? "—" }
            )
          );
        get().log(studentId, "enrollment_request", `${subject?.name ?? "—"} / ${teacher?.name ?? "—"}`,
          "act.d_enrollment_request", { subject: subject?.name ?? "—", teacher: teacher?.name ?? "—" });
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
          get().addNotification(student.linkedAccountId, "enrollment",
            "Votre demande d'inscription a été refusée.", "notif.registration_rejected");
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
              `Vous êtes inscrit(e) : ${DAY_LABEL[opts.dayOfWeek]} ${opts.timeSlot}`,
              "notif.group_formed_student",
              { day: opts.dayOfWeek, slot: opts.timeSlot }
            );
          }
        });

        const teacher = get().teachers.find((x) => x.id === teacherId);
        const teacherAccount = get().users.find((u) => u.teacherId === teacherId);
        if (teacherAccount) {
          get().addNotification(
            teacherAccount.id,
            "enrollment",
            `Nouveau groupe : ${reqs.length} élève(s), ${DAY_LABEL[opts.dayOfWeek]} ${opts.timeSlot}`,
            "notif.group_formed_teacher",
            { n: reqs.length, day: opts.dayOfWeek, slot: opts.timeSlot }
          );
        }
        get().log("admin", "form_group", `${teacher?.name ?? "—"} — ${reqs.length} élève(s)`,
          "act.d_form_group", { teacher: teacher?.name ?? "—", n: reqs.length });
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
              `Nouvelle demande d'inscription : ${req.name} (${req.role === "teacher" ? "enseignant" : "étudiant"}).`,
              "notif.registration_request",
              { name: req.name, role: req.role }
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

          // Les groupes reperes avant la validation deviennent de vraies
          // inscriptions : la personne a deja fait son choix, le lui redemander
          // apres coup n'apporterait rien. selfEnroll gere la liste d'attente
          // si le groupe s'est rempli entre-temps.
          const wanted = req.wantedClassIds ?? (req.preferredClassId ? [req.preferredClassId] : []);
          for (const classId of wanted) get().selfEnroll(student.id, classId);
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
        get().log("u_admin", "registration.approve", `Inscription acceptée : ${req.name}`,
          "act.d_registration_approve", { name: req.name });
        return { email: req.email, name: req.name };
      },
      rejectRegistration: (requestId) => {
        const req = get().registrationRequests.find((r) => r.id === requestId);
        if (!req) return null;
        const reviewedAt = now();
        set((s) => ({ registrationRequests: s.registrationRequests.map((r) => (r.id === requestId ? { ...r, status: "rejected", reviewedAt } : r)) }));
        fbPatch(COLLECTIONS.registrationRequests, requestId, { status: "rejected", reviewedAt });
        get().log("u_admin", "registration.reject", `Inscription refusée : ${req.name}`,
          "act.d_registration_reject", { name: req.name });
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

// Couverture des actions du magasin, une par une.
//
// Le parcours complet (journey.mjs) montre qu'elles fonctionnent ensemble ;
// ici on s'assure qu'AUCUNE n'est laissée sans vérification, y compris celles
// qu'un parcours normal ne traverse pas — listes d'attente, refus, annulations.
import { loadApp } from "../harness.mjs";

export default async function store(r) {
  const { useData } = await loadApp();
  const st = () => useData.getState();
  const couvertes = new Set();
  const check = (action, label, cond, detail = "") => {
    couvertes.add(action);
    r.ok(label, cond, detail);
  };

  r.suite("Actions du magasin");

  /* ------------------------------------------------------------- matières */
  r.section("Matières");
  const nSub = st().subjects.length;
  const sub = st().addSubject("Philosophie");
  check("addSubject", "ajout", st().subjects.length === nSub + 1);
  st().updateSubject(sub.id, { name: "Philo" });
  check("updateSubject", "renommage", st().subjects.find((x) => x.id === sub.id)?.name === "Philo");
  st().deleteSubject(sub.id);
  check("deleteSubject", "suppression", !st().subjects.some((x) => x.id === sub.id));

  /* --------------------------------------------------------------- élèves */
  r.section("Élèves");
  const stu = st().addStudent({
    name: "Test Élève", level: "3as", phone: "0550000001",
    parentName: "P", parentPhone: "0550000002", status: "active",
  });
  check("addStudent", "ajout", st().students.some((x) => x.id === stu.id));
  st().updateStudent(stu.id, { phone: "0550000009" });
  check("updateStudent", "modification",
    st().students.find((x) => x.id === stu.id)?.phone === "0550000009");

  /* ---------------------------------------------------------- enseignants */
  r.section("Enseignants");
  const tea = st().addTeacher({
    name: "Test Prof", phone: "0550000003", subjects: [],
    paymentMode: "percentage", schoolCutValue: 30,
  });
  check("addTeacher", "ajout", st().teachers.some((x) => x.id === tea.id));
  st().updateTeacher(tea.id, { schoolCutValue: 40 });
  check("updateTeacher", "modification",
    st().teachers.find((x) => x.id === tea.id)?.schoolCutValue === 40);

  /* -------------------------------------------------------------- groupes */
  r.section("Groupes et inscriptions");
  const cls = st().addClass({
    subjectId: st().subjects[0].id, teacherId: tea.id, roomId: st().rooms[0]?.id ?? "rm_big",
    level: "3as", sessionType: "group", dayOfWeek: "sunday", timeSlot: "10:00-12:00",
    maxStudents: 3, pricePerSession: 2500, schoolCutMode: "percentage", schoolCutValue: 25,
  });
  check("addClass", "création", st().classes.some((c) => c.id === cls.id));
  st().updateClass(cls.id, { maxStudents: 4 });
  check("updateClass", "modification",
    st().classes.find((c) => c.id === cls.id)?.maxStudents === 4);

  st().enroll(stu.id, cls.id, 2500);
  const enr = st().enrollments.find((e) => e.studentId === stu.id && e.classId === cls.id);
  check("enroll", "inscription", !!enr);
  check("enroll", "compteur incrémenté",
    st().classes.find((c) => c.id === cls.id)?.currentStudents === 1);

  const stu2 = st().addStudent({
    name: "Test Élève 2", level: "3as", phone: "0550000004",
    parentName: "P", parentPhone: "0550000005", status: "active",
  });
  st().adminAssign(stu2.id, cls.id, 2500);
  check("adminAssign", "affectation par l'administration",
    st().enrollments.some((e) => e.studentId === stu2.id && e.classId === cls.id));

  const cls2 = st().addClass({
    subjectId: st().subjects[0].id, teacherId: tea.id, roomId: st().rooms[1]?.id ?? "rm_1",
    level: "3as", sessionType: "group", dayOfWeek: "tuesday", timeSlot: "10:00-12:00",
    maxStudents: 4, pricePerSession: 3100, schoolCutMode: "percentage", schoolCutValue: 25,
  });
  const enr2 = st().enrollments.find((e) => e.studentId === stu2.id && e.classId === cls.id);
  st().moveStudent(enr2.id, cls2.id);
  const apres = st().enrollments.find((e) => e.studentId === stu2.id && e.classId === cls2.id);
  check("moveStudent", "transfert vers un autre groupe", !!apres);
  check("moveStudent", "au prix du NOUVEAU groupe", apres?.pricePerSession === 3100,
    `enregistré ${apres?.pricePerSession}`);

  st().unenroll(apres.id);
  check("unenroll", "désinscription",
    !st().enrollments.some((e) => e.id === apres.id));

  /* -------------------------------------------------------------- présence */
  r.section("Présence et facturation");
  const jour = Date.UTC(2026, 8, 6);
  st().saveAttendance(cls.id, tea.id, jour, { [stu.id]: "present" });
  const sess = st().sessions.find((s) => s.classId === cls.id && s.date === jour);
  check("saveAttendance", "séance enregistrée", !!sess);
  const fact = st().payments.find((p) => p.sessionId === sess.id);
  check("saveAttendance", "facture générée", !!fact);

  st().markPaid(fact.id);
  check("markPaid", "encaissement",
    st().payments.find((p) => p.id === fact.id)?.status === "paid");
  st().markUnpaid(fact.id);
  check("markUnpaid", "annulation d'encaissement",
    st().payments.find((p) => p.id === fact.id)?.status === "unpaid");
  st().markMonthPaid(stu.id, fact.month);
  check("markMonthPaid", "mois entier encaissé",
    st().payments.filter((p) => p.studentId === stu.id && p.month === fact.month)
      .every((p) => p.status === "paid"));
  st().markMonthUnpaid(stu.id, fact.month);
  check("markMonthUnpaid", "mois entier remis en impayé",
    st().payments.filter((p) => p.studentId === stu.id && p.month === fact.month)
      .every((p) => p.status === "unpaid"));

  const avantRelance = st().payments.find((p) => p.id === fact.id)?.reminderCount ?? 0;
  st().sendReminder(fact.id);
  check("sendReminder", "relance comptée",
    (st().payments.find((p) => p.id === fact.id)?.reminderCount ?? 0) > avantRelance);

  /* ------------------------------------------------------------------ paie */
  r.section("Paie");
  st().markPaid(fact.id);
  st().payTeacher(tea.id, 100, "2026-09");
  const po = st().teacherPayouts.find((p) => p.teacherId === tea.id);
  check("payTeacher", "versement enregistré", !!po);
  st().confirmPayout(po.id);
  check("confirmPayout", "confirmé par l'enseignant",
    st().teacherPayouts.find((p) => p.id === po.id)?.confirmedByTeacher === true);

  /* --------------------------------------------------- créneaux et attente */
  r.section("Créneaux, liste d'attente, demandes");
  st().addSlotRequest(tea.id, undefined, "friday", "16:00-18:00");
  const sr = st().slotRequests.find((x) => x.teacherId === tea.id && x.dayOfWeek === "friday");
  check("addSlotRequest", "demande de créneau", !!sr);
  st().resolveSlotRequest(sr.id, "rejected");
  check("resolveSlotRequest", "traitée",
    st().slotRequests.find((x) => x.id === sr.id)?.status === "rejected");

  st().joinWaitlist(cls.id, stu2.id);
  check("joinWaitlist", "entrée en liste d'attente",
    (st().classes.find((c) => c.id === cls.id)?.waitingList ?? []).includes(stu2.id));
  st().leaveWaitlist(cls.id, stu2.id);
  check("leaveWaitlist", "sortie de liste d'attente",
    !(st().classes.find((c) => c.id === cls.id)?.waitingList ?? []).includes(stu2.id));

  const er = st().requestEnrollment(stu2.id, st().subjects[0].id, tea.id);
  check("requestEnrollment", "demande d'inscription", !!er);
  if (er) {
    st().cancelEnrollmentRequest(er.id);
    check("cancelEnrollmentRequest", "annulée par l'élève",
      !st().enrollmentRequests.some((x) => x.id === er.id));
  }

  /* ------------------------------------------------------------- comptes */
  r.section("Demandes de compte");
  st().addRegistrationRequest({
    id: "rr_refus", name: "Refusé Test", role: "student", level: "3as",
    phone: "0550000006", parentName: "P", parentPhone: "0550000007",
    email: "refuse.test@horizon.app",
  });
  check("addRegistrationRequest", "demande déposée",
    st().registrationRequests.some((x) => x.id === "rr_refus"));
  st().rejectRegistration("rr_refus");
  check("rejectRegistration", "refus enregistré",
    st().registrationRequests.find((x) => x.id === "rr_refus")?.status === "rejected");

  st().addRegistrationRequest({
    id: "rr_ok", name: "Accepté Test", role: "student", level: "3as",
    phone: "0550000008", parentName: "P", parentPhone: "0550000009",
    email: "accepte.test@horizon.app",
  });
  st().approveRegistration("rr_ok");
  check("approveRegistration", "fiche élève créée",
    st().students.some((s) => s.name === "Accepté Test"));

  /* ------------------------------------------------- notifications, journal */
  r.section("Notifications et journal");
  const nAvant = st().notifications.length;
  st().addNotification("u_admin", "attendance", "Test", "notif.seat_freed");
  check("addNotification", "notification ajoutée", st().notifications.length === nAvant + 1);
  st().markNotificationRead(st().notifications[0].id);
  check("markNotificationRead", "marquée lue", st().notifications[0].read === true);
  const lAvant = st().activityLog.length;
  st().log("u_admin", "test", "trace");
  check("log", "trace ajoutée", st().activityLog.length === lAvant + 1);

  /* -------------------------------------------------- suppressions en cascade */
  r.section("Suppressions");
  st().deleteClass(cls2.id);
  check("deleteClass", "groupe supprimé", !st().classes.some((c) => c.id === cls2.id));
  check("deleteClass", "inscriptions liées supprimées",
    !st().enrollments.some((e) => e.classId === cls2.id));

  const clsId = cls.id;
  st().deleteStudent(stu.id);
  check("deleteStudent", "élève supprimé", !st().students.some((s) => s.id === stu.id));
  check("deleteStudent", "inscriptions liées supprimées",
    !st().enrollments.some((e) => e.studentId === stu.id));
  const restant = st().enrollments.filter((e) => e.classId === clsId).length;
  check("deleteStudent", "compteur du groupe recalculé",
    st().classes.find((c) => c.id === clsId)?.currentStudents === restant);

  st().deleteTeacher(tea.id);
  check("deleteTeacher", "refusé tant qu'il encadre un groupe",
    st().teachers.some((x) => x.id === tea.id));
  st().classes.filter((c) => c.teacherId === tea.id).forEach((c) => st().deleteClass(c.id));
  st().deleteTeacher(tea.id);
  check("deleteTeacher", "accepté une fois ses groupes retirés",
    !st().teachers.some((x) => x.id === tea.id));

  /* --------------------------------------------------------- jeu de départ */
  r.section("Données de démonstration");
  st().loadDemoData();
  check("loadDemoData", "jeu rechargé", st().students.length > 0 && st().classes.length > 0);

  r.note(`${couvertes.size} actions du magasin couvertes`);
}

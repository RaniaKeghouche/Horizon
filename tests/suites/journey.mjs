// Un mois complet à l'académie, joué d'un bout à l'autre.
//
// Les autres fichiers vérifient des règles isolées. Celui-ci vérifie qu'elles
// tiennent ENSEMBLE : chaque étape est faite par le rôle qui la ferait dans la
// vraie vie, et on contrôle après chaque geste ce qui a changé AILLEURS —
// c'est là que se logent les défauts, jamais dans une fonction prise seule.
import { loadApp, loadLocales, makeT } from "../harness.mjs";

export default async function journey(r) {
  const app = await loadApp();
  const { useData, notificationText, activityText, allowedTeachersFor } = app;
  const st = () => useData.getState();
  const T = Object.fromEntries(
    Object.entries(loadLocales()).map(([k, v]) => [k, makeT(v)])
  );

  // On part d'une base vierge : le scénario ne doit rien devoir aux données
  // de démonstration.
  const SUBJ = st().subjects[0]?.id ?? st().addSubject("Anglais").id;
  const ROOM = st().rooms[0]?.id ?? "rm_big";

  r.suite("Parcours complet — un mois à l'académie");

  /* ------------------------------------------------- 1. l'école se constitue */
  r.section("1. L'administration met en place le groupe");

  // L'enseignante passe par la même porte que dans la réalité : elle demande
  // un compte, l'administration valide. C'est ce qui lui donne un compte de
  // connexion — sans lui, elle ne recevrait aucune notification.
  st().addRegistrationRequest({
    id: "req_prof", name: "Yasmina Haddadi", role: "teacher",
    phone: "0551 00 11 22", subjects: [SUBJ],
    email: "yasmina.haddadi@horizon.app",
  });
  st().approveRegistration("req_prof");
  const prof = st().teachers.find((t) => t.name === "Yasmina Haddadi");
  const profCompte = st().users.find((u) => u.teacherId === prof?.id);
  r.ok("l'enseignante est enregistrée", !!prof);
  r.ok("et dispose d'un compte de connexion", !!profCompte);

  // Habilitation par niveau : c'est elle qui filtrera la liste du formulaire.
  st().updateSubject(SUBJ, { teachersByLevel: { "3as": [prof.id] } });
  const proposes = allowedTeachersFor(
    st().subjects.find((s) => s.id === SUBJ)?.teachersByLevel, "3as", st().teachers
  );
  r.eq("le formulaire de groupe ne proposerait qu'elle", proposes.length, 1);
  r.ok("et c'est bien elle", proposes[0]?.id === prof.id);

  const groupe = st().addClass({
    subjectId: SUBJ, teacherId: prof.id, roomId: ROOM, level: "3as",
    sessionType: "group_special", dayOfWeek: "monday", timeSlot: "16:00-18:00",
    maxStudents: 2, pricePerSession: 3600,
    schoolCutMode: "percentage", schoolCutValue: 25,
  });
  r.eq("le groupe ouvre vide", groupe.currentStudents, 0);
  r.ok("il n'est pas verrouillé", groupe.isLocked === false);

  /* ------------------------------------- 2. une famille demande un compte */
  r.section("2. Une famille crée un compte, l'administration valide");

  const before = { eleves: st().students.length, comptes: st().users.length };
  st().addRegistrationRequest({
    id: "req_test", name: "Nadia Benali", role: "student", level: "3as",
    phone: "0551443322", parentName: "Karim Benali", parentPhone: "0661223344",
    email: "nadia.benali@horizon.app",
  });
  r.eq("la demande est en attente",
    st().registrationRequests.find((x) => x.id === "req_test")?.status, "pending");
  r.ok("l'administration en est avertie",
    st().notifications.some((n) => n.msgKey === "notif.registration_request"));

  st().approveRegistration("req_test");
  const eleve = st().students.find((s) => s.name === "Nadia Benali");
  const compte = st().users.find((u) => u.displayName === "Nadia Benali");
  r.eq("une fiche élève est créée", st().students.length, before.eleves + 1);
  r.eq("un compte est créé", st().users.length, before.comptes + 1);
  r.ok("les deux sont liés dans les deux sens",
    !!eleve?.linkedAccountId && compte?.linkedStudentId === eleve.id);
  r.eq("le niveau demandé est conservé", eleve?.level, "3as");

  /* --------------------------------------- 3. l'élève s'inscrit lui-même */
  r.section("3. L'élève s'inscrit au groupe");

  const inscrit = await st().selfEnroll(eleve.id, groupe.id);
  r.ok("l'inscription est acceptée", inscrit === true);
  const insc = st().enrollments.find((e) => e.studentId === eleve.id && e.classId === groupe.id);
  r.eq("elle est facturée au PRIX DU GROUPE, pas à un tarif générique",
    insc?.pricePerSession, 3600);
  r.eq("le compteur du groupe suit", st().classes.find((c) => c.id === groupe.id)?.currentStudents, 1);
  r.ok("l'administration est prévenue",
    st().notifications.some((n) => n.msgKey === "notif.self_enrolled"));

  // Un second élève remplit le groupe : il doit alors se verrouiller.
  const eleve2 = st().addStudent({
    name: "Sofiane Amrani", level: "3as", phone: "0770 11 22 33",
    parentName: "Amel Amrani", parentPhone: "0770 44 55 66", status: "active",
  });
  await st().selfEnroll(eleve2.id, groupe.id);
  const plein = st().classes.find((c) => c.id === groupe.id);
  r.eq("à 2/2 le groupe est complet", plein.currentStudents, 2);
  r.ok("et se verrouille", plein.isLocked === true);

  const eleve3 = st().addStudent({
    name: "Rym Cherif", level: "3as", phone: "0770 77 88 99",
    parentName: "Sami Cherif", parentPhone: "0770 88 99 00", status: "active",
  });
  await st().selfEnroll(eleve3.id, groupe.id);
  r.ok("un troisième élève est refusé",
    !st().enrollments.some((e) => e.studentId === eleve3.id && e.classId === groupe.id));

  /* ------------------------------------------- 4. l'enseignante fait l'appel */
  r.section("4. L'enseignante enregistre la séance");

  const lundi = Date.UTC(2026, 7, 10);
  st().saveAttendance(groupe.id, prof.id, lundi,
    { [eleve.id]: "present", [eleve2.id]: "absent_paid" }, "Première séance.");

  const seance = st().sessions.find((s) => s.classId === groupe.id && s.date === lundi);
  r.ok("la séance existe", !!seance);
  r.eq("elle porte le numéro 1", seance?.sessionNumber, 1);

  const facturesSeance = st().payments.filter((p) => p.sessionId === seance.id);
  r.eq("deux états facturables → deux factures", facturesSeance.length, 2);
  r.eq("chacune au prix du groupe", facturesSeance[0]?.amount, 3600);
  r.eq("part école = 25 %", facturesSeance[0]?.schoolCut, 900);
  r.eq("part enseignante = 75 %", facturesSeance[0]?.teacherCut, 2700);
  r.ok("toutes impayées au départ", facturesSeance.every((p) => p.status === "unpaid"));

  // Une absence NON facturée ne doit rien produire.
  const mardi = Date.UTC(2026, 7, 17);
  st().saveAttendance(groupe.id, prof.id, mardi,
    { [eleve.id]: "present", [eleve2.id]: "absent_free" });
  const s2 = st().sessions.find((s) => s.classId === groupe.id && s.date === mardi);
  r.eq("séance suivante numérotée 2", s2?.sessionNumber, 2);
  r.eq("une seule facture cette fois", st().payments.filter((p) => p.sessionId === s2.id).length, 1);

  // Rattrapage d'une séance oubliée, ANTÉRIEURE aux deux autres.
  const oubliee = Date.UTC(2026, 7, 3);
  st().saveAttendance(groupe.id, prof.id, oubliee, { [eleve.id]: "present" });
  const ordre = st().sessions
    .filter((s) => s.classId === groupe.id && !s.isExtra)
    .sort((a, b) => a.date - b.date)
    .map((s) => s.sessionNumber);
  r.ok("les numéros suivent les dates, pas l'ordre de saisie",
    ordre.every((n, i) => n === i + 1), JSON.stringify(ordre));

  /* --------------------------------------- 5. l'argent circule et se tient */
  r.section("5. Encaissement, paie, confirmation");

  const duFamille = st().payments
    .filter((p) => p.studentId === eleve.id && p.status === "unpaid")
    .reduce((n, p) => n + p.amount, 0);
  r.ok("la famille doit quelque chose", duFamille > 0);

  const aEncaisser = st().payments.find((p) => p.studentId === eleve.id && p.status === "unpaid");
  const notifsAvant = st().notifications.length;
  st().markPaid(aEncaisser.id, "espèces");
  r.eq("la facture passe à payée",
    st().payments.find((p) => p.id === aEncaisser.id)?.status, "paid");
  r.ok("la famille reçoit un accusé", st().notifications.length > notifsAvant);
  r.ok("et c'est bien un accusé de paiement",
    st().notifications[0]?.msgKey === "notif.payment_received");
  r.ok("l'encaissement est tracé au journal",
    st().activityLog.some((a) => a.action === "payment.mark_paid"));

  // Seul l'argent RÉELLEMENT encaissé est versable à l'enseignante.
  const encaisse = st().payments
    .filter((p) => p.enrollmentId && p.status === "paid" &&
      st().enrollments.find((e) => e.id === p.enrollmentId)?.teacherId === prof.id)
    .reduce((n, p) => n + p.teacherCut, 0);
  r.eq("la part enseignante correspond à ce qui est encaissé", encaisse, 2700);

  st().payTeacher(prof.id, encaisse, "2026-08");
  const versement = st().teacherPayouts.find((p) => p.teacherId === prof.id);
  r.eq("le versement est enregistré", versement?.amount, 2700);
  r.ok("il n'est pas encore confirmé", !versement.confirmedByTeacher);
  r.ok("l'enseignante en est avertie",
    st().notifications.some((n) => n.msgKey === "notif.payout_sent"));

  st().confirmPayout(versement.id);
  r.ok("elle confirme la réception",
    st().teacherPayouts.find((p) => p.id === versement.id)?.confirmedByTeacher === true);

  /* ------------------------------- 6. corrections : l'argent ne s'évapore pas */
  r.section("6. Corriger une séance sans perdre d'argent");

  const payee = st().payments.find((p) => p.status === "paid" && p.sessionId === seance.id);
  const impayee = st().payments.find((p) => p.status === "unpaid" && p.sessionId === seance.id);
  const cible = payee ?? facturesSeance[0];

  st().saveAttendance(groupe.id, prof.id, lundi,
    { [eleve.id]: "absent_free", [eleve2.id]: "absent_free" }, "corrigée", seance.id);

  r.ok("une facture DÉJÀ PAYÉE survit à la correction",
    st().payments.some((p) => p.id === cible.id && p.status === "paid"));
  if (impayee) {
    r.ok("une facture impayée devenue sans objet disparaît",
      !st().payments.some((p) => p.id === impayee.id));
  }

  /* ------------------------------------------ 7. un départ libère la place */
  r.section("7. Un départ rend la place utilisable");

  st().deleteStudent(eleve2.id);
  const apresDepart = st().classes.find((c) => c.id === groupe.id);
  const reels = st().enrollments.filter((e) => e.classId === groupe.id).length;
  r.eq("le compteur suit les inscriptions réelles", apresDepart.currentStudents, reels);
  r.ok("le groupe se rouvre", apresDepart.isLocked === false);
  await st().selfEnroll(eleve3.id, groupe.id);
  r.ok("l'élève refusé plus tôt peut enfin entrer",
    st().enrollments.some((e) => e.studentId === eleve3.id && e.classId === groupe.id));

  /* ------------------------------- 8. tout cela se lit dans les trois langues */
  r.section("8. Ce que voient les familles, dans leur langue");

  const notif = st().notifications.find((n) => n.msgKey);
  const trace = st().activityLog.find((a) => a.msgKey);
  for (const lang of ["fr", "en", "ar"]) {
    const n = notificationText(notif, T[lang]);
    const a = activityText(trace, T[lang]);
    r.ok(`${lang} : notification composée, sans clé apparente`,
      !n.includes("notif.") && !n.includes("{{"), n);
    r.ok(`${lang} : journal composé, sans clé apparente`,
      !a.includes("act.") && !a.includes("{{"), a);
  }
  r.ok("l'arabe ne contient plus de français figé",
    !/marqué|Paiement|Ajout/.test(notificationText(notif, T.ar)),
    notificationText(notif, T.ar));

  /* ------------------------------------ 9. l'enseignante ne voit que son monde */
  r.section("9. Cloisonnement des données");

  const sesGroupes = st().classes.filter((c) => c.teacherId === prof.id);
  r.eq("elle n'a qu'un groupe", sesGroupes.length, 1);
  const sesEleves = new Set(
    st().enrollments.filter((e) => e.teacherId === prof.id).map((e) => e.studentId)
  );
  r.ok("et ne touche qu'aux élèves qui y sont inscrits",
    [...sesEleves].every((id) => st().enrollments.some(
      (e) => e.studentId === id && e.classId === groupe.id)));
}

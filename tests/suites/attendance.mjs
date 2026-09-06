// L'appel : une séance par groupe et par date, qu'on corrige au lieu de la
// refaire.
//
// C'est la règle qui protège les familles d'une double facturation. Elle vivait
// uniquement dans l'écran d'appel, qui la déduisait de ce qu'il avait déjà reçu
// du serveur ; deux appareils simultanés, ou une séance pas encore synchronisée,
// suffisaient à créer un doublon. Elle est maintenant tenue par le magasin,
// seul écrivain, et vérifiée ici.
import { loadApp } from "../harness.mjs";

export default async function attendance(r) {
  const { useData } = await loadApp();
  const st = () => useData.getState();

  r.suite("Appel — enregistrer, puis corriger");

  // Un groupe neuf, pour ne rien devoir aux données de démonstration.
  const prof = st().addTeacher({
    name: "Prof Appel", phone: "0555 00 00 00", subjects: [],
    paymentMode: "percentage", schoolCutValue: 25,
  });
  const cls = st().addClass({
    subjectId: st().subjects[0].id, teacherId: prof.id,
    roomId: st().rooms[0]?.id ?? "rm_big", level: "3as", sessionType: "group",
    dayOfWeek: "monday", timeSlot: "16:00-18:00", maxStudents: 5,
    pricePerSession: 2000, schoolCutMode: "percentage", schoolCutValue: 25,
  });
  const mk = (nom, tel) => st().addStudent({
    name: nom, level: "3as", phone: tel, parentName: "P",
    parentPhone: "0770 00 00 00", status: "active",
  });
  const a = mk("Appel A", "0770 00 00 01");
  const b = mk("Appel B", "0770 00 00 02");
  st().enroll(a.id, cls.id, 2000);
  st().enroll(b.id, cls.id, 2000);

  const jour = Date.UTC(2026, 8, 14);
  const seancesDu = () => st().sessions.filter((s) => s.classId === cls.id && s.date === jour);
  const facturesDe = (sid) => st().payments.filter((p) => p.sessionId === sid);

  /* ------------------------------------------------ premier enregistrement */
  r.section("Premier enregistrement");
  st().saveAttendance(cls.id, prof.id, jour, { [a.id]: "present", [b.id]: "present" });
  r.eq("une séance est créée", seancesDu().length, 1);
  const seance = seancesDu()[0];
  r.eq("deux présences facturées", facturesDe(seance.id).length, 2);

  /* ------------------------------- ré-enregistrement SANS identifiant */
  r.section("Ré-enregistrer le même jour ne recommence pas");
  st().saveAttendance(cls.id, prof.id, jour, { [a.id]: "present", [b.id]: "absent_free" });
  r.eq("toujours UNE seule séance ce jour-là", seancesDu().length, 1);
  r.eq("et c'est la même", seancesDu()[0]?.id, seance.id);
  r.eq("la correction a bien été appliquée",
    st().sessions.find((s) => s.id === seance.id)?.attendance[b.id], "absent_free");
  r.eq("la facture devenue sans objet a disparu", facturesDe(seance.id).length, 1);
  r.note("sans cette règle, la même leçon était facturée deux fois");

  /* ------------------------------------------ correction explicite */
  r.section("Correction en désignant la séance");
  st().saveAttendance(cls.id, prof.id, jour,
    { [a.id]: "absent_paid", [b.id]: "absent_free" }, "corrigée", seance.id);
  r.eq("toujours une seule séance", seancesDu().length, 1);
  r.eq("la note est enregistrée",
    st().sessions.find((s) => s.id === seance.id)?.notes, "corrigée");
  r.eq("une absence facturée reste facturée", facturesDe(seance.id).length, 1);

  /* ----------------------------------------- l'argent encaissé est sanctuarisé */
  r.section("Une facture déjà encaissée survit à toute correction");
  const facture = facturesDe(seance.id)[0];
  st().markPaid(facture.id);
  st().saveAttendance(cls.id, prof.id, jour,
    { [a.id]: "absent_free", [b.id]: "absent_free" }, undefined, seance.id);
  r.ok("elle est toujours là",
    st().payments.some((p) => p.id === facture.id && p.status === "paid"));

  /* --------------------------------------------- la séance supplémentaire */
  r.section("La séance supplémentaire, elle, s'ajoute");
  st().saveAttendance(cls.id, prof.id, jour, { [a.id]: "present" }, "rattrapage", undefined, true);
  r.eq("deux séances ce jour-là, désormais", seancesDu().length, 2);
  r.ok("l'une est marquée supplémentaire", seancesDu().some((s) => s.isExtra === true));
  r.ok("la séance ordinaire est intacte",
    seancesDu().some((s) => s.id === seance.id && !s.isExtra));

  r.section("Numérotation");
  const ordinaires = st().sessions
    .filter((s) => s.classId === cls.id && !s.isExtra)
    .sort((x, y) => x.date - y.date);
  r.ok("les séances ordinaires sont numérotées 1..n dans l'ordre des dates",
    ordinaires.every((s, i) => s.sessionNumber === i + 1),
    JSON.stringify(ordinaires.map((s) => s.sessionNumber)));
  r.ok("une séance supplémentaire ne consomme pas de numéro",
    st().sessions.filter((s) => s.classId === cls.id && s.isExtra)
      .every((s) => s.sessionNumber === undefined));

  /* --------------------------------------------- notifications aux familles */
  r.section("Les parents ne sont prévenus que si quelque chose change");
  const avant = st().notifications.length;
  const courant = st().sessions.find((s) => s.id === seance.id);
  st().saveAttendance(cls.id, prof.id, jour, { ...courant.attendance }, courant.notes, seance.id);
  r.eq("ré-enregistrer à l'identique n'alerte personne", st().notifications.length, avant);

  /* ------------------------------------ un encaissement = un seul accusé */
  r.section("Encaisser un cycle ne noie pas la famille sous les accusés");
  // On rattache un compte à l'élève : sans compte, aucune notification ne part.
  const compteId = "u_appel_" + a.id;
  st().addNotification(compteId, "attendance", "amorce");   // le compte existe côté notifications
  st().updateStudent(a.id, { linkedAccountId: compteId });

  const j2 = Date.UTC(2026, 8, 21);
  st().saveAttendance(cls.id, prof.id, j2, { [a.id]: "present", [b.id]: "present" });
  const j3 = Date.UTC(2026, 8, 28);
  st().saveAttendance(cls.id, prof.id, j3, { [a.id]: "present", [b.id]: "present" });

  const aPayer = st().payments.filter((p) => p.studentId === a.id && p.status === "unpaid");
  r.ok("plusieurs factures sont dues", aPayer.length >= 2, `${aPayer.length}`);

  const avantAccuses = st().notifications.filter((n) => n.msgKey === "notif.payment_received").length;
  st().markPaidMany(aPayer.map((p) => p.id), "espèces");
  const accuses = st().notifications.filter((n) => n.msgKey === "notif.payment_received");
  r.eq("un seul accusé pour tout l'encaissement", accuses.length - avantAccuses, 1);
  r.eq("et il porte le TOTAL encaissé",
    accuses[0]?.msgParams?.amount, aPayer.reduce((n, p) => n + p.amount, 0));
  r.ok("toutes les factures sont réglées",
    aPayer.every((p) => st().payments.find((x) => x.id === p.id)?.status === "paid"));

  r.section("Encaisser un mois entier prévient aussi la famille");
  const j4 = Date.UTC(2026, 9, 5);
  st().saveAttendance(cls.id, prof.id, j4, { [a.id]: "present" });
  const duMois = st().payments.filter((p) => p.studentId === a.id && p.status === "unpaid");
  const avantMois = st().notifications.filter((n) => n.msgKey === "notif.payment_received").length;
  st().markMonthPaid(a.id, duMois[0]?.month);
  const apresMois = st().notifications.filter((n) => n.msgKey === "notif.payment_received").length;
  r.eq("un accusé, pas zéro ni dix", apresMois - avantMois, 1);
  r.note("avant correction : le cycle en envoyait un par facture, le mois n'en envoyait aucun");

}

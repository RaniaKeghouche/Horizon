// Les règles métier pures : calendrier, dates, tarifs, habilitations.
// Elles n'ont besoin ni d'interface ni de base — ce sont elles qu'on peut
// balayer exhaustivement.
import { loadApp } from "../harness.mjs";

export default async function rules(r) {
  const {
    dayOfWeekOf, lastOccurrence, classOnDay, allowedTeachersFor,
    isoDate, parseIsoDate, computeCut, defaultPrice, DAYS,
  } = await loadApp();

  r.suite("Règles métier");

  /* ------------------------------------------------------------- calendrier */
  r.section("Jour de la semaine et dernière occurrence");

  const samedi = new Date(2026, 8, 5); // samedi 5 septembre 2026
  r.eq("le 05/09/2026 est un samedi", dayOfWeekOf(samedi), "saturday");
  r.eq("aujourd'hui compte comme sa propre occurrence",
    isoDate(lastOccurrence("saturday", samedi)), "2026-09-05");
  r.eq("un groupe du lundi renvoie au lundi PRÉCÉDENT",
    isoDate(lastOccurrence("monday", samedi)), "2026-08-31");

  // Balayage exhaustif : 7 jours de départ × 7 jours visés.
  let futur = 0, mauvaisJour = 0;
  for (let d = 0; d < 7; d++) {
    const depuis = new Date(2026, 8, 5 + d);
    for (const jour of DAYS) {
      const got = lastOccurrence(jour, depuis);
      if (got.getTime() > depuis.getTime()) futur++;
      if (dayOfWeekOf(got) !== jour) mauvaisJour++;
    }
  }
  r.eq("aucune date rendue n'est dans le futur (49 cas)", futur, 0);
  r.eq("chaque date tombe bien sur le jour demandé (49 cas)", mauvaisJour, 0);

  r.section("Dates locales et non UTC");
  const minuitPasse = new Date(2026, 8, 5, 0, 30);
  r.eq("00h30 reste le 5 septembre", isoDate(minuitPasse), "2026-09-05");
  r.note(`l'ancien code (toISOString) donnait ici « ${minuitPasse.toISOString().slice(0, 10)} »`);
  r.eq("aller-retour sans perte", isoDate(parseIsoDate("2026-09-05")), "2026-09-05");
  r.eq("minuit LOCAL, pas UTC", parseIsoDate("2026-09-05").getHours(), 0);

  r.section("Le groupe du jour");
  const groupes = [
    { id: "en", dayOfWeek: "monday", timeSlot: "17:00-18:30" },
    { id: "ar", dayOfWeek: "saturday", timeSlot: "10:00-12:00" },
    { id: "es", dayOfWeek: "saturday", timeSlot: "8:00 - 10:00" },
  ];
  r.eq("le plus tôt d'abord, créneau non normalisé compris",
    classOnDay(groupes, "saturday")?.id, "es");
  r.eq("aucun groupe ce jour-là", classOnDay(groupes, "friday"), undefined);

  /* ---------------------------------------------------------- habilitations */
  r.section("Qui peut enseigner quoi, à quel niveau");
  const T = [{ id: "t1" }, { id: "t2" }, { id: "t3" }];
  const map = { "3as": ["t1", "t3"], "1as": ["t2"] };
  const ids = (a) => a.map((x) => x.id).join(",");

  r.eq("seuls les habilités", ids(allowedTeachersFor(map, "3as", T)), "t1,t3");
  r.eq("un autre niveau, d'autres enseignants", ids(allowedTeachersFor(map, "1as", T)), "t2");
  r.eq("niveau sans habilitation → tout le monde",
    ids(allowedTeachersFor(map, "2am", T)), "t1,t2,t3");
  r.eq("champ absent → tout le monde", ids(allowedTeachersFor(undefined, "3as", T)), "t1,t2,t3");
  r.eq("habilitation pointant un enseignant supprimé → tout le monde",
    ids(allowedTeachersFor({ "3as": ["parti"] }, "3as", T)), "t1,t2,t3");
  r.eq("l'enseignant déjà retenu reste proposé",
    ids(allowedTeachersFor(map, "3as", T, "t2")), "t1,t3,t2");
  r.eq("sans doublon s'il est déjà habilité",
    ids(allowedTeachersFor(map, "3as", T, "t1")), "t1,t3");

  /* ------------------------------------------------------------- répartition */
  r.section("Partage école / enseignant");
  const pct = computeCut(4000, "percentage", 25);
  r.eq("25 % pour l'école", pct.schoolCut, 1000);
  r.eq("le reste pour l'enseignant", pct.teacherCut, 3000);
  r.eq("les deux parts font le total", pct.schoolCut + pct.teacherCut, 4000);

  const fixe = computeCut(4000, "fixed", 1500);
  r.eq("montant fixe pour l'école", fixe.schoolCut, 1500);
  r.eq("le reste pour l'enseignant", fixe.teacherCut, 2500);

  const excessif = computeCut(1000, "fixed", 5000);
  r.ok("une part fixe supérieure au prix est plafonnée", excessif.schoolCut <= 1000,
    `école ${excessif.schoolCut} pour un prix de 1000`);
  r.ok("l'enseignant ne doit jamais rien", excessif.teacherCut >= 0);

  r.section("Tarif par défaut");
  r.ok("un groupe ordinaire a un tarif de référence",
    typeof defaultPrice("group", "3as") === "number");
  r.eq("un cours particulier n'en a pas : l'admin fixe le prix",
    defaultPrice("one_on_one", "3as"), null);
  r.eq("un groupe spécial non plus", defaultPrice("group_special", "3as"), null);
}

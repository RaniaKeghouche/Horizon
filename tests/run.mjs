#!/usr/bin/env node
// Lanceur unique : `npm test`.
//
// Cinq suites, dans un ordre qui va du plus petit au plus large :
//   règles   — les fonctions pures (calendrier, tarifs, habilitations)
//   magasin  — chaque action prise séparément
//   appel    — une séance par groupe et par date, corrigée et non refaite
//   langues  — fichiers de traduction, clés appelées, textes composés
//   parcours — un mois entier joué d'un bout à l'autre, tous rôles confondus
//
// CE QUE CES TESTS NE COUVRENT PAS, et c'est important : ils s'exécutent en
// mode démonstration, où les écritures vers Supabase ne font rien. Les règles
// de sécurité (RLS), la file d'attente hors-ligne et la synchronisation temps
// réel ne sont donc PAS vérifiées ici. Elles se valident sur la base réelle.
import { createReporter } from "./harness.mjs";
import rules from "./suites/rules.mjs";
import store from "./suites/store.mjs";
import attendance from "./suites/attendance.mjs";
import i18n from "./suites/i18n.mjs";
import journey from "./suites/journey.mjs";

const SUITES = [
  ["regles", rules],
  ["magasin", store],
  ["appel", attendance],
  ["langues", i18n],
  ["parcours", journey],
];

const filtre = process.argv[2];
const r = createReporter();
const debut = Date.now();

for (const [nom, suite] of SUITES) {
  if (filtre && !nom.startsWith(filtre)) continue;
  try {
    await suite(r);
  } catch (err) {
    r.ok(`la suite « ${nom} » s'est interrompue`, false, String(err?.stack ?? err));
  }
}

const duree = ((Date.now() - debut) / 1000).toFixed(1);
const { passed, failures, C } = r;

console.log("");
if (failures.length === 0) {
  console.log(C.green(C.bold(`  ${passed} vérifications, aucun échec`)) + C.dim(`  (${duree}s)`));
  console.log(C.dim("  Rappel : mode démonstration — RLS, file d'attente et temps réel non couverts."));
} else {
  console.log(C.red(C.bold(`  ${failures.length} échec(s) sur ${passed + failures.length} vérifications`)) + C.dim(`  (${duree}s)`));
  for (const f of failures) {
    console.log("  " + C.red("✗") + " " + C.dim(f.suite + " — ") + f.label);
    if (f.detail) console.log("      " + C.dim(f.detail));
  }
}
console.log("");
process.exit(failures.length ? 1 : 0);

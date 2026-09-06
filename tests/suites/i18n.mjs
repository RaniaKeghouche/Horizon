// Tout ce qui touche à la langue : les fichiers de traduction eux-mêmes, les
// clés réellement appelées par le code, et les textes composés à l'affichage
// (notifications, journal, documents imprimés).
//
// Ces contrôles sont statiques : ils lisent les sources. C'est ce qui permet
// d'attraper une clé oubliée AVANT qu'un utilisateur ne voie « notif.assigned »
// s'afficher à l'écran.
import fs from "node:fs";
import path from "node:path";
import { loadApp, loadLocales, makeT, ROOT } from "../harness.mjs";

const LANGS = ["fr", "en", "ar"];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name) && !p.includes("locales")) out.push(p);
  }
  return out;
}

function flatten(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === "object") Object.assign(out, flatten(v, prefix + k + "."));
    else out[prefix + k] = v;
  }
  return out;
}

function has(dict, key) {
  let cur = dict;
  for (const p of key.split(".")) {
    if (!cur || typeof cur !== "object" || !(p in cur)) return false;
    cur = cur[p];
  }
  return typeof cur === "string";
}

export default async function i18n(r) {
  const app = await loadApp();
  const { notificationText, activityText, buildAttendanceReportHTML, buildInvoicesHTML } = app;
  const loc = loadLocales();
  const flat = Object.fromEntries(LANGS.map((l) => [l, flatten(loc[l])]));
  const T = Object.fromEntries(LANGS.map((l) => [l, makeT(loc[l])]));

  r.suite("Langues");

  /* ------------------------------------------- les fichiers entre eux */
  r.section("Parité des trois fichiers");
  for (const lang of ["en", "ar"]) {
    const manque = Object.keys(flat.fr).filter((k) => !(k in flat[lang]));
    r.eq(`${lang} ne manque aucune clé du français`, manque.length, 0);
    if (manque.length) r.note("absentes : " + manque.slice(0, 8).join(", "));
  }
  r.note(`fr ${Object.keys(flat.fr).length} · en ${Object.keys(flat.en).length} · ar ${Object.keys(flat.ar).length}`);

  r.section("Variables attendues par les traductions");
  // Une traduction peut légitimement OMETTRE une variable — en arabe, le
  // singulier « طالب واحد » ne répète pas le chiffre. Ce qui casse, c'est
  // l'inverse : une variable qu'aucun appelant ne fournit s'affiche telle
  // quelle, « {{name}} », en plein écran.
  const vars = (s) => new Set([...String(s).matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]));
  const inventees = [];
  for (const k of Object.keys(flat.fr)) {
    const ref = vars(flat.fr[k]);
    for (const lang of ["en", "ar"]) {
      if (!(k in flat[lang])) continue;
      for (const v of vars(flat[lang][k])) {
        if (!ref.has(v)) inventees.push(`${k} [${lang}] → {{${v}}}`);
      }
    }
  }
  r.eq("aucune traduction n'attend une variable que le code ne fournit pas",
    inventees.length, 0);
  if (inventees.length) r.note(inventees.slice(0, 6).join(", "));

  /* --------------------------------------- les clés appelées par le code */
  r.section("Clés appelées par le code");
  const files = walk(path.join(ROOT, "src"));
  const call = /(?<![A-Za-z0-9_$.])t\(\s*"([^"]+)"/g;
  const absentes = [];
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(call)) {
      const key = m[1];
      if (key.endsWith(".") || key.endsWith("_")) continue; // préfixe concaténé
      const ko = LANGS.filter((l) => !has(loc[l], key));
      if (ko.length) absentes.push(`${key} (${f.replace(ROOT, "").replaceAll("\\", "/")}) → ${ko}`);
    }
  }
  r.eq("aucune clé manquante", absentes.length, 0);
  for (const a of absentes.slice(0, 10)) r.note(a);
  r.note(`${files.length} fichiers analysés`);

  r.section("Pas de clé ambiguë");
  // Le point est le séparateur de niveaux d'i18next : une clé finale qui en
  // contient un serait lue comme un chemin et ne serait jamais trouvée.
  const ambigues = Object.keys(flat.fr).filter((k) => /\.[ad]_[a-z_]*\./.test(k));
  r.eq("aucune clé d'action ne contient de point", ambigues.length, 0);
  if (ambigues.length) r.note(ambigues.slice(0, 5).join(", "));

  /* ------------------------------------------------ textes composés */
  r.section("Notifications, dans la langue du lecteur");
  const notif = {
    id: "n", userId: "u", type: "attendance", read: false, createdAt: 0,
    message: "Ahmed Saïdi a été marqué Présent.",
    msgKey: "notif.attendance",
    msgParams: { name: "Ahmed Saïdi", state: "present" },
  };
  for (const lang of LANGS) {
    const out = notificationText(notif, T[lang]);
    r.ok(`${lang} : le nom propre traverse intact`, out.includes("Ahmed Saïdi"), out);
    r.ok(`${lang} : ni clé ni variable apparente`,
      !out.includes("notif.") && !out.includes("{{"), out);
  }
  r.ok("l'état de présence est traduit, pas laissé en identifiant",
    !notificationText(notif, T.ar).includes("present"));
  r.ok("un jour de semaine aussi",
    !notificationText({ ...notif, msgKey: "notif.slot_assigned",
      msgParams: { subject: "English", day: "monday", slot: "16:00-18:00" } }, T.ar)
      .includes("monday"));
  r.eq("une ligne ancienne, sans clé, reste lisible",
    notificationText({ ...notif, msgKey: undefined, msgParams: undefined }, T.ar),
    "Ahmed Saïdi a été marqué Présent.");

  r.section("Journal d'activité");
  const trace = { details: "Ajout de l'étudiant Ahmed Saïdi",
                  msgKey: "act.d_student_create", msgParams: { name: "Ahmed Saïdi" } };
  for (const lang of LANGS) {
    const out = activityText(trace, T[lang]);
    r.ok(`${lang} : composé sans clé apparente`,
      !out.includes("act.") && !out.includes("{{") && out.includes("Ahmed Saïdi"), out);
  }
  const ACTIONS = ["student.create", "teacher.create", "class.create", "enroll",
    "attendance.mark", "payment.mark_paid", "payment.mark_month_paid", "teacher.pay",
    "enrollment_request", "form_group", "registration.approve", "registration.reject"];
  for (const lang of LANGS) {
    const trous = ACTIONS.filter((a) => {
      const k = a.replaceAll(".", "_");
      return !has(loc[lang], `act.a_${k}`) || !has(loc[lang], `act.d_${k}`);
    });
    r.eq(`${lang} : les ${ACTIONS.length} actions ont libellé et détail`, trous.length, 0);
    if (trous.length) r.note(trous.join(", "));
  }

  r.section("Documents remis aux familles");
  const releve = {
    studentName: "Ahmed Saïdi", level: "3AS", period: "août 2026",
    lines: [{ date: Date.UTC(2026, 7, 10), subject: "English", teacher: "Amine",
              slot: "16:00-18:00", state: "present" }],
    present: 3, excused: 0, absent: 1, rate: 75,
  };
  const facture = {
    student: { name: "Ahmed Saïdi", parentName: "Karim Saïdi", parentPhone: "0770 99 88 77" },
    subjects: [], totalPaid: 2700, totalDue: 5400,
  };
  for (const lang of LANGS) {
    const rtl = lang === "ar" ? "rtl" : "ltr";
    const a = buildAttendanceReportHTML(releve, T[lang], lang);
    const b = buildInvoicesHTML([facture], T[lang], lang);
    r.ok(`${lang} : relevé — langue et sens du texte déclarés`,
      a.includes(`<html lang="${lang}"`) && a.includes(`dir="${rtl}"`));
    r.ok(`${lang} : facture — langue et sens du texte déclarés`,
      b.includes(`<html lang="${lang}"`) && b.includes(`dir="${rtl}"`));
    r.ok(`${lang} : aucune clé brute dans les documents`,
      !a.includes("doc.") && !b.includes("doc."));
  }
  r.ok("le relevé arabe ne garde aucun titre français",
    !buildAttendanceReportHTML(releve, T.ar, "ar").includes("Relevé de présences"));
  r.ok("la facture arabe non plus",
    !buildInvoicesHTML([facture], T.ar, "ar").includes("Total payé"));
}

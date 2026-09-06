// Socle commun des tests : compilation du magasin, environnement navigateur
// simulé, et les quelques fonctions d'assertion utilisées partout.
//
// Il n'y a pas de lanceur de tests dans ce projet et il n'y en a pas besoin :
// l'essentiel de la logique est constitué de fonctions pures et d'un magasin
// Zustand, deux choses qui s'exécutent très bien dans Node.
import { build } from "esbuild";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* ------------------------------------------------------------ environnement */

/** Le magasin persiste dans `localStorage` : on lui en fournit un en mémoire. */
function installBrowserShims() {
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
    clear: () => mem.clear(),
    key: (i) => [...mem.keys()][i] ?? null,
    get length() {
      return mem.size;
    },
  };
  globalThis.window = globalThis;
  globalThis.addEventListener = () => {};
}

/** Les variables `import.meta.env.*` n'existent pas hors de Vite. On les vide
 *  toutes : sans URL Supabase, l'application démarre en mode démonstration,
 *  qui est justement le mode où la logique métier est observable seule. */
const ENV_KEYS = [
  "VITE_OWNER_EMAIL", "VITE_EMAILJS_SERVICE_ID", "VITE_EMAILJS_PUBLIC_KEY",
  "VITE_EMAILJS_TEMPLATE_CODE", "VITE_EMAILJS_TEMPLATE_DECISION",
  "VITE_SHEET_WEBHOOK_URL", "VITE_SCHOOL_NAME", "VITE_SCHOOL_CITY",
  "VITE_SCHOOL_ADDRESS", "VITE_SCHOOL_PHONE", "VITE_SCHOOL_PHONE_E164",
  "VITE_SCHOOL_EMAIL", "VITE_SCHOOL_WHATSAPP", "VITE_SCHOOL_MAPS",
  "VITE_SCHOOL_COORDS", "VITE_SCHOOL_PLUS_CODE",
  "VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY",
];

let bundlePromise = null;

/** Compile les modules applicatifs en un seul fichier exécutable par Node. */
export function loadApp() {
  if (bundlePromise) return bundlePromise;
  installBrowserShims();

  const outdir = fs.mkdtempSync(path.join(os.tmpdir(), "horizon-tests-"));
  const entry = path.join(outdir, "entry.ts");
  fs.writeFileSync(
    entry,
    [
      'export { useData } from "SRC/data/store";',
      'export * from "SRC/lib/schedule";',
      'export * from "SRC/lib/format";',
      'export * from "SRC/lib/notifications";',
      'export * from "SRC/lib/payments";',
      'export { buildAttendanceReportHTML } from "SRC/lib/attendanceReport";',
      'export { buildInvoicesHTML } from "SRC/lib/invoice";',
    ].join("\n").replaceAll("SRC", path.join(ROOT, "src").replaceAll("\\", "/")),
    "utf8"
  );

  const define = { "import.meta.env.DEV": "false" };
  for (const k of ENV_KEYS) define[`import.meta.env.${k}`] = '""';

  const outfile = path.join(outdir, "app.mjs");
  bundlePromise = build({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile,
    logLevel: "error",
    define,
    loader: { ".json": "json" },
  }).then(() => import(`file://${outfile.replaceAll("\\", "/")}`));

  return bundlePromise;
}

/* ------------------------------------------------------------- traduction */

/** Un `t` minimal : résolution par chemin puis interpolation `{{...}}`.
 *  Suffisant pour vérifier qu'une clé existe et que ses variables sont
 *  remplies — ce que fait i18next, en plus simple. */
export function makeT(dict) {
  return (key, options) => {
    let cur = dict;
    for (const part of key.split(".")) {
      if (typeof cur !== "object" || cur === null) return key;
      cur = cur[part];
    }
    if (typeof cur !== "string") return key;
    return cur.replace(/\{\{(\w+)\}\}/g, (_m, name) =>
      options && name in options ? String(options[name]) : `{{${name}}}`);
  };
}

export function loadLocales() {
  const out = {};
  for (const lang of ["fr", "en", "ar"]) {
    out[lang] = JSON.parse(fs.readFileSync(path.join(ROOT, "src/locales", `${lang}.json`), "utf8"));
  }
  return out;
}

/* ------------------------------------------------------------- assertions */

const C = {
  green: (s) => `[32m${s}[0m`,
  red: (s) => `[31m${s}[0m`,
  dim: (s) => `[90m${s}[0m`,
  bold: (s) => `[1m${s}[0m`,
};

export function createReporter() {
  const failures = [];
  let passed = 0;
  let suite = "";

  return {
    suite(name) {
      suite = name;
      console.log("\n" + C.bold(name));
    },
    section(name) {
      console.log(C.dim("  " + name));
    },
    ok(label, condition, detail = "") {
      if (condition) {
        passed++;
        console.log("    " + C.green("✓") + " " + label);
      } else {
        failures.push({ suite, label, detail });
        console.log("    " + C.red("✗ " + label) + (detail ? C.dim("  — " + detail) : ""));
      }
    },
    eq(label, actual, expected) {
      this.ok(label, Object.is(actual, expected) || String(actual) === String(expected),
        `attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`);
    },
    note(text) {
      console.log(C.dim("      " + text));
    },
    get passed() { return passed; },
    get failures() { return failures; },
    C,
  };
}

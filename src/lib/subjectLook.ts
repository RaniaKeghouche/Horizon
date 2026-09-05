import {
  BookOpen, Languages, Calculator, FlaskConical, Atom, Landmark, Palette, Music,
  Globe2, Monitor, type LucideIcon,
} from "lucide-react";

/**
 * Apparence d'une matière : sa teinte et son icône.
 *
 * Vit ici plutôt que dans une page pour que la même matière garde la même
 * couleur partout — la grille de l'emploi du temps et le répertoire des
 * matières doivent se répondre, sinon « Physique » est bleu ici et or là.
 *
 * La teinte est tirée du NOM et non de la position dans une liste : ajouter ou
 * supprimer une matière ne doit pas repeindre toutes les autres.
 */
export interface Tint {
  bg: string;
  fg: string;
}

/* Huit teintes bien separees sur la roue — violet, bleuet, ciel, sarcelle,
   vert, ambre, rose, corail — au lieu de six voisines toutes bleutees. Deux
   matieres cote a cote se distinguent ainsi vraiment.

   Chaque `fg` passe 4.5:1 sur son `bg` : ces couleurs portent du texte
   (nom de matiere, libelle de pastille) et pas seulement des aplats. */
const TINTS: Tint[] = [
  { bg: "#efe8fd", fg: "#6d3bd4" },
  { bg: "#e6e9fa", fg: "#3a4d9c" },
  { bg: "#e2f1fb", fg: "#0e6fa8" },
  { bg: "#dbf1f2", fg: "#0a6a76" },
  { bg: "#dcf5e8", fg: "#0a7c48" },
  { bg: "#fdf0d6", fg: "#a1620a" },
  { bg: "#fce7ee", fg: "#b8265a" },
  { bg: "#fdeae4", fg: "#b4402a" },
];

export function subjectTint(name: string): Tint {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

/* Les libellés arrivent en français, en anglais ou en arabe selon qui a créé la
   matière : on teste les trois. */
const ICONS: [RegExp, LucideIcon][] = [
  [/math|رياض/i, Calculator],
  [/physi|فيزي/i, Atom],
  [/chim|chem|scien|svt|علوم|كيمي/i, FlaskConical],
  [/info|comput|numeriq|numériq|إعلام|حاسوب/i, Monitor],
  [/hist|geo|géo|تاريخ|جغراف/i, Landmark],
  [/art|dessin|رسم/i, Palette],
  [/musi|موسيق/i, Music],
  [/anglais|english|franc|franç|french|espagn|spanish|arab|عرب|انجل|إنجل|فرنس|اسبان/i, Languages],
  [/langue|language|لغة/i, Globe2],
];

export function subjectIcon(name: string): LucideIcon {
  for (const [re, Icon] of ICONS) if (re.test(name)) return Icon;
  return BookOpen;
}

/** Style inline consommé par les règles CSS `var(--tile-bg)` / `var(--tile-fg)`. */
export function tintStyle(name: string): React.CSSProperties {
  const t = subjectTint(name);
  return { "--tile-bg": t.bg, "--tile-fg": t.fg } as React.CSSProperties;
}

/* ------------------------------------------------------------------ familles */

/**
 * La famille d'une matiere : langues, maths, sciences, informatique, autres.
 *
 * Deduite du NOM, comme l'icone et la teinte, et pour la meme raison : la base
 * ne porte aucune categorie, et en ajouter une obligerait a reclasser a la main
 * chaque matiere existante. Les libelles arrivent en francais, en anglais ou en
 * arabe selon qui a cree la matiere, d'ou les trois alphabets dans chaque motif.
 */
export type SubjectFamily = "langues" | "maths" | "sciences" | "info" | "autres";

const FAMILIES: [RegExp, SubjectFamily][] = [
  [/math|رياض/i, "maths"],
  [/info|comput|numeriq|numériq|إعلام|حاسوب/i, "info"],
  [/physi|chim|chem|scien|svt|bio|فيزي|علوم|كيمي|أحياء/i, "sciences"],
  [
    /anglais|english|franc|franç|french|espagn|spanish|arab|allemand|german|italien|langue|language|عرب|انجل|إنجل|فرنس|اسبان|ألمان|لغة/i,
    "langues",
  ],
];

export function subjectFamily(name: string): SubjectFamily {
  for (const [re, family] of FAMILIES) if (re.test(name)) return family;
  return "autres";
}

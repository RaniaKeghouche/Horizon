import type { RegistrationRequest } from "./types";

/**
 * Le dossier d'inscription vu comme une procedure administrative.
 *
 * Une personne qui attend veut savoir deux choses : ou en est son dossier, et
 * ce qu'il reste a faire. Ces fonctions repondent a partir de l'etat reel de la
 * demande — aucune etape decorative, aucun pourcentage invente : chaque etape
 * cochee correspond a une donnee reellement presente.
 *
 * Pures et sans effet de bord, donc verifiables sans interface ni base.
 */

/** Annee scolaire algerienne : elle commence en septembre. */
export function schoolYear(d: Date = new Date()): string {
  const y = d.getFullYear();
  return d.getMonth() >= 8 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

/**
 * Numero de dossier lisible, derive de l'identifiant du compte.
 *
 * Il n'est pas tire au hasard et n'est pas stocke : la meme demande donne
 * toujours le meme numero, ce qui permet de le citer au telephone sans qu'il
 * faille une colonne de plus en base.
 */
export function dossierRef(id: string, d: Date = new Date()): string {
  const tail = id.replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase().padStart(4, "0");
  return `HS-${d.getFullYear()}-${tail}`;
}

export interface DossierStep {
  /** Cle i18n, sous auth.step_*. */
  key: string;
  done: boolean;
  /** Ce que l'etape a retenu, quand il y a quelque chose a montrer. */
  detail?: string;
}

/**
 * Les etapes d'un dossier, dans l'ordre ou elles se franchissent.
 *
 * « Groupes choisis » compte comme une etape parce que c'en est une : un dossier
 * qui arrive avec des groupes deja reperes se traite plus vite qu'un dossier nu.
 */
export function dossierSteps(req: RegistrationRequest): DossierStep[] {
  const wanted = req.wantedClassIds?.length ?? 0;
  const contactOk = !!req.phone && (req.role !== "student" || !!req.parentPhone);
  return [
    { key: "filed", done: true },
    { key: "contact", done: contactOk },
    { key: "choice", done: wanted > 0, detail: wanted > 0 ? String(wanted) : undefined },
    { key: "review", done: req.status === "approved" },
  ];
}

/** Part des etapes franchies, en pourcentage entier. */
export function dossierProgress(steps: DossierStep[]): number {
  if (steps.length === 0) return 0;
  return Math.round((100 * steps.filter((s) => s.done).length) / steps.length);
}

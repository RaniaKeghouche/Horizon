import type { AppNotification } from "./types";

/**
 * Un récapitulatif quotidien parle du jour même : « Aujourd'hui : … Demain : … ».
 * Passé minuit il ne décrit plus rien, mais il restait dans la liste et dans le
 * compteur de non-lus, qui montait d'un cran par jour sans que personne puisse
 * rien en faire.
 *
 * Les autres types sont des traces d'évènements (paiement, inscription, demande
 * de créneau) : ils gardent leur valeur en vieillissant et ne sont donc jamais
 * masqués ici.
 *
 * Ce filtre est un filtre d'AFFICHAGE : la ligne reste en base. Elle ne pèse rien
 * et un historique tronqué se répare mal.
 */
export function isStale(n: AppNotification, now: Date = new Date()): boolean {
  if (n.type !== "daily_digest") return false;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return n.createdAt < startOfToday;
}

/** Les notifications encore utiles à un utilisateur, les plus récentes d'abord. */
export function liveNotifications(
  all: AppNotification[],
  userId: string | undefined,
  now: Date = new Date()
): AppNotification[] {
  if (!userId) return [];
  return all
    .filter((n) => n.userId === userId && !isStale(n, now))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Ce que doit afficher la pastille rouge. */
export function unreadCount(
  all: AppNotification[],
  userId: string | undefined,
  now: Date = new Date()
): number {
  return liveNotifications(all, userId, now).filter((n) => !n.read).length;
}

/** Parametres dont la VALEUR est elle-meme une cle a traduire.
 *  `day: "monday"` doit s'afficher « الاثنين », pas « monday ». */
const TRANSLATED_PARAMS: Record<string, string> = {
  day: "days.",
  role: "roles.",
  state: "attendance.",
};

/**
 * Le texte a afficher pour une notification, dans la langue du lecteur.
 *
 * Les lignes anciennes n'ont pas de `msgKey` : on retombe alors sur le texte
 * francais deja stocke, plutot que d'afficher une cle brute.
 */
export function notificationText(
  n: AppNotification,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  if (!n.msgKey) return n.message;
  const params: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(n.msgParams ?? {})) {
    const prefix = TRANSLATED_PARAMS[k];
    if (prefix && typeof v === "string") params[k] = t(prefix + v);
    // Les montants suivent la meme mise en forme que partout ailleurs
    // (`formatDA`) : « 2 700 » et non « 2700 ».
    else if (k === "amount" && typeof v === "number") params[k] = v.toLocaleString("fr-FR");
    else params[k] = v;
  }
  return t(n.msgKey, params);
}

/**
 * Le detail d'une entree de journal, dans la langue du lecteur.
 *
 * Meme principe et memes regles que `notificationText` : les lignes ecrites
 * avant l'ajout de `msgKey` retombent sur leur texte francais.
 */
export function activityText(
  a: { details: string; msgKey?: string; msgParams?: Record<string, string | number> },
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  if (!a.msgKey) return a.details;
  const params: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(a.msgParams ?? {})) {
    const prefix = TRANSLATED_PARAMS[k];
    params[k] = prefix && typeof v === "string" ? t(prefix + v) : v;
  }
  return t(a.msgKey, params);
}

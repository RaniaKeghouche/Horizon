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

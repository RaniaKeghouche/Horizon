// Small formatting helpers shared across the UI.

/** Format an amount in Algerian Dinar, e.g. 10800 -> "10 800 DA". */
export function formatDA(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} DA`;
}

/** "2026-07" billing key for a given date (defaults to now). */
export function billingMonth(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Short readable date, e.g. "25/07/2026". */
export function formatDate(millis: number): string {
  return new Date(millis).toLocaleDateString("fr-FR");
}

/** Date + time, e.g. "25/07 16:00". */
export function formatDateTime(millis: number): string {
  return new Date(millis).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "2026-09-05" pour un `<input type="date">`, dans le fuseau local.
 *
 *  `toISOString()` convertit d'abord en UTC : en Algerie (UTC+1) une date prise
 *  entre minuit et 1h du matin y perd un jour, et l'appel du samedi se serait
 *  enregistre au vendredi. On lit donc les composantes locales. */
export function isoDate(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** L'inverse : "2026-09-05" -> minuit local (et non minuit UTC, ce que ferait
 *  `new Date("2026-09-05")`). Reciproque exacte de `isoDate`. */
export function parseIsoDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

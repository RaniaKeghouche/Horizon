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

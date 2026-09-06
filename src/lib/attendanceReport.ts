import type { AttendanceState } from "./types";
import { formatDate } from "./format";

/**
 * Le releve de presences, imprimable.
 *
 * Meme principe que la facture (lib/invoice.ts) : une fenetre autonome, des
 * styles en ligne, et l'impression du navigateur — qui sait aussi enregistrer
 * en PDF. Rien a installer, et le document reste lisible tel quel a l'ecran.
 */

export interface ReportLine {
  date: number;
  subject: string;
  teacher: string;
  slot: string;
  state: AttendanceState;
}

export interface AttendanceReport {
  studentName: string;
  level: string;
  period: string;
  lines: ReportLine[];
  present: number;
  excused: number;
  absent: number;
  rate: number | null;
}


/** Le traducteur passe par les appelants : ces documents sont remis a une
 *  famille, ils doivent etre dans SA langue, pas dans celle du code. */
export type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Les trois etats, traduits comme partout ailleurs dans l'application.
 *  Une absence non facturee est une absence excusee par l'ecole. */
const STATE_KEY: Record<AttendanceState, string> = {
  present: "attendance.present",
  absent_free: "attendance.absent_free",
  absent_paid: "attendance.absent_paid",
};

const STYLES = `
  * { box-sizing: border-box; }
  body { font: 13px/1.5 system-ui, "Segoe UI", Roboto, sans-serif; color: #0f2547; margin: 28px; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  .sub { color: #5b6b80; margin: 0 0 18px; }
  .kpis { display: flex; gap: 10px; margin-bottom: 18px; }
  .kpi { flex: 1; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; }
  .kpi b { display: block; font-size: 19px; }
  .kpi span { font-size: 11px; color: #5b6b80; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: start; padding: 7px 8px; border-bottom: 1px solid #e2e8f0; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #5b6b80; }
  .st { font-weight: 700; }
  .present { color: #076c3d; }
  .absent_free { color: #b54708; }
  .absent_paid { color: #b42318; }
  footer { margin-top: 22px; font-size: 11px; color: #5b6b80; }
  @media print { body { margin: 12mm; } }
`;

export function buildAttendanceReportHTML(
  r: AttendanceReport,
  t: Translate,
  lang = "fr"
): string {
  const rtl = lang === "ar";
  const rows = r.lines
    .map(
      (l) => `<tr>
        <td>${formatDate(l.date)}</td>
        <td>${esc(l.subject)}</td>
        <td>${esc(l.teacher)}</td>
        <td>${esc(l.slot)}</td>
        <td class="st ${l.state}">${esc(t(STATE_KEY[l.state]))}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html><html lang="${lang}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8" />
<title>${esc(t("doc.att_title"))} — ${esc(r.studentName)}</title><style>${STYLES}</style></head>
<body>
  <h1>${esc(t("doc.att_title"))}</h1>
  <p class="sub">${esc(r.studentName)} — ${esc(r.level)} · ${esc(r.period)}</p>
  <div class="kpis">
    <div class="kpi"><b>${r.rate === null ? "—" : r.rate + " %"}</b><span>${esc(t("doc.att_rate"))}</span></div>
    <div class="kpi"><b>${r.present}</b><span>${esc(t("doc.att_done"))}</span></div>
    <div class="kpi"><b>${r.excused}</b><span>${esc(t("doc.att_excused"))}</span></div>
    <div class="kpi"><b>${r.absent}</b><span>${esc(t("doc.att_missed"))}</span></div>
  </div>
  <table>
    <thead><tr><th>${esc(t("doc.col_date"))}</th><th>${esc(t("doc.col_subject"))}</th><th>${esc(t("doc.col_teacher"))}</th><th>${esc(t("doc.col_slot"))}</th><th>${esc(t("doc.col_state"))}</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="5">${esc(t("doc.att_empty"))}</td></tr>`}</tbody>
  </table>
  <footer>${esc(t("doc.generated", { school: "Horizon Skills Academy", date: formatDate(Date.now()) }))}</footer>
</body></html>`;
}

export function printAttendanceReport(r: AttendanceReport, t: Translate, lang = "fr"): void {
  const win = window.open("", "_blank", "width=880,height=940");
  if (!win) {
    alert(t("doc.popup_att"));
    return;
  }
  win.document.write(buildAttendanceReportHTML(r, t, lang));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

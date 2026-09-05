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

/** Les trois libelles du releve, dans la langue du document (francais). */
const LABEL: Record<AttendanceState, string> = {
  present: "Présent",
  // Une absence non facturee est une absence excusee par l'ecole.
  absent_free: "Justifiée",
  absent_paid: "Absente",
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

export function buildAttendanceReportHTML(r: AttendanceReport): string {
  const rows = r.lines
    .map(
      (l) => `<tr>
        <td>${formatDate(l.date)}</td>
        <td>${esc(l.subject)}</td>
        <td>${esc(l.teacher)}</td>
        <td>${esc(l.slot)}</td>
        <td class="st ${l.state}">${LABEL[l.state]}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html><html lang="fr" dir="ltr"><head><meta charset="utf-8" />
<title>Relevé de présences — ${esc(r.studentName)}</title><style>${STYLES}</style></head>
<body>
  <h1>Relevé de présences</h1>
  <p class="sub">${esc(r.studentName)} — ${esc(r.level)} · ${esc(r.period)}</p>
  <div class="kpis">
    <div class="kpi"><b>${r.rate === null ? "—" : r.rate + " %"}</b><span>Taux de présence</span></div>
    <div class="kpi"><b>${r.present}</b><span>Séances suivies</span></div>
    <div class="kpi"><b>${r.excused}</b><span>Absences justifiées</span></div>
    <div class="kpi"><b>${r.absent}</b><span>Absences</span></div>
  </div>
  <table>
    <thead><tr><th>Date</th><th>Matière</th><th>Enseignant</th><th>Créneau</th><th>État</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5">Aucune séance sur la période.</td></tr>'}</tbody>
  </table>
  <footer>Horizon Skills Academy — document généré le ${formatDate(Date.now())}.</footer>
</body></html>`;
}

export function printAttendanceReport(r: AttendanceReport): void {
  const win = window.open("", "_blank", "width=880,height=940");
  if (!win) {
    alert("Autorisez les pop-ups pour imprimer le relevé.");
    return;
  }
  win.document.write(buildAttendanceReportHTML(r));
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

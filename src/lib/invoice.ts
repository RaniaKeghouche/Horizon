// Printable PDF invoice (cahier §11). Dependency-free: builds a standalone HTML
// document and opens the browser/webview print dialog (user can "Save as PDF").
import type { StudentBilling } from "./billing";
import { formatDA, formatDate } from "./format";

const SCHOOL = {
  name: "Horizon Skills Academy",
  subtitle: "Centre de langues — Algérie",
};

export function buildInvoiceHTML(billing: StudentBilling): string {
  const rows = billing.subjects
    .map(
      (s) => `
      <tr>
        <td>${escapeHtml(s.subjectName)}</td>
        <td>${escapeHtml(s.teacherName)}</td>
        <td>Séance ${s.currentSession} / ${s.totalSessions}</td>
        <td class="r">${formatDA(s.pricePerSession)}</td>
        <td class="r">${formatDA(s.amountPaid)}</td>
        <td class="r ${s.amountDue > 0 ? "due" : ""}">${formatDA(s.amountDue)}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="fr" dir="ltr"><head><meta charset="utf-8" />
<title>Facture — ${escapeHtml(billing.student.name)}</title>
<style>
  * { font-family: "Segoe UI", Arial, sans-serif; }
  body { padding: 40px; color: #1a2230; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1f4fd8; padding-bottom: 16px; }
  .brand { font-size: 22px; font-weight: 800; color: #1f4fd8; }
  .sub { color: #6b7688; font-size: 13px; }
  h1 { font-size: 18px; margin: 24px 0 4px; }
  .meta { color: #6b7688; font-size: 13px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { padding: 10px; border-bottom: 1px solid #e3e8f0; text-align: left; font-size: 14px; }
  th { background: #f4f6fb; }
  .r { text-align: right; }
  .due { color: #d8362f; font-weight: 700; }
  .total { margin-top: 20px; text-align: right; font-size: 18px; }
  .total strong { color: #d8362f; }
  .foot { margin-top: 40px; color: #9aa6ba; font-size: 12px; text-align: center; }
</style></head>
<body>
  <div class="head">
    <div>
      <div class="brand">${SCHOOL.name}</div>
      <div class="sub">${SCHOOL.subtitle}</div>
    </div>
    <div class="sub">Émise le ${formatDate(Date.now())}</div>
  </div>

  <h1>Facture — ${escapeHtml(billing.student.name)}</h1>
  <div class="meta">Parent : ${escapeHtml(billing.student.parentName)} · ${escapeHtml(
    billing.student.parentPhone
  )}</div>

  <table>
    <thead><tr>
      <th>Matière</th><th>Enseignant</th><th>Progression</th>
      <th class="r">Prix/séance</th><th class="r">Payé</th><th class="r">Dû</th>
    </tr></thead>
    <tbody>${rows || `<tr><td colspan="6">Aucune inscription.</td></tr>`}</tbody>
  </table>

  <div class="total">
    Total payé : ${formatDA(billing.totalPaid)}<br/>
    Total dû : <strong>${formatDA(billing.totalDue)}</strong>
  </div>

  <div class="foot">Horizon Skills Academy — Merci de votre confiance.</div>
</body></html>`;
}

export function printInvoice(billing: StudentBilling) {
  const html = buildInvoiceHTML(billing);
  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) {
    alert("Autorisez les pop-ups pour imprimer la facture.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

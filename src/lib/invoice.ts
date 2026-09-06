// Printable PDF invoices (cahier §11). Dependency-free: builds standalone HTML and opens
// the browser/webview print dialog. Supports printing several invoices on one document,
// one per page (cahier: "sélectionner plusieurs factures et les imprimer ensemble").
import type { StudentBilling } from "./billing";
import { formatDA, formatDate } from "./format";

const SCHOOL_NAME = "Horizon Skills Academy";

/** Le traducteur passe par les appelants : ces documents sont remis a une
 *  famille, ils doivent etre dans SA langue, pas dans celle du code. */
export type Translate = (key: string, options?: Record<string, unknown>) => string;


const STYLES = `
  * { font-family: "Segoe UI", Arial, sans-serif; }
  body { padding: 40px; color: #1a2230; }
  .invoice { page-break-after: always; }
  .invoice:last-child { page-break-after: auto; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #5b53e8; padding-bottom: 16px; }
  .brand { font-size: 22px; font-weight: 800; color: #5b53e8; }
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
  .foot { margin-top: 30px; color: #9aa6ba; font-size: 12px; text-align: center; }
`;

function invoiceBody(billing: StudentBilling, t: Translate): string {
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

  return `<div class="invoice">
    <div class="head">
      <div><div class="brand">${SCHOOL_NAME}</div><div class="sub">${escapeHtml(t("doc.inv_subtitle"))}</div></div>
      <div class="sub">${escapeHtml(t("doc.issued_on", { date: formatDate(Date.now()) }))}</div>
    </div>
    <h1>${escapeHtml(t("doc.invoice_for", { name: billing.student.name }))}</h1>
    <div class="meta">${escapeHtml(t("doc.parent", { name: billing.student.parentName, phone: billing.student.parentPhone }))}</div>
    <table>
      <thead><tr>
        <th>${escapeHtml(t("doc.col_subject"))}</th><th>${escapeHtml(t("doc.col_teacher"))}</th><th>${escapeHtml(t("doc.col_progress"))}</th>
        <th class="r">${escapeHtml(t("doc.col_price"))}</th><th class="r">${escapeHtml(t("doc.col_paid"))}</th><th class="r">${escapeHtml(t("doc.col_due"))}</th>
      </tr></thead>
      <tbody>${rows || `<tr><td colspan="6">${escapeHtml(t("doc.inv_empty"))}</td></tr>`}</tbody>
    </table>
    <div class="total">${escapeHtml(t("doc.total_paid", { amount: formatDA(billing.totalPaid) }))}<br/><strong>${escapeHtml(t("doc.total_due", { amount: formatDA(billing.totalDue) }))}</strong></div>
    <div class="foot">${escapeHtml(t("doc.thanks", { school: SCHOOL_NAME }))}</div>
  </div>`;
}

export function buildInvoiceHTML(billing: StudentBilling, t: Translate, lang = "fr"): string {
  return buildInvoicesHTML([billing], t, lang);
}

export function buildInvoicesHTML(billings: StudentBilling[], t: Translate, lang = "fr"): string {
  return `<!doctype html><html lang="${lang}" dir="${lang === "ar" ? "rtl" : "ltr"}"><head><meta charset="utf-8" />
<title>${t("doc.inv_title")} — ${SCHOOL_NAME}</title><style>${STYLES}</style></head>
<body>${billings.map((b) => invoiceBody(b, t)).join("")}</body></html>`;
}

export function printInvoices(billings: StudentBilling[], t: Translate, lang = "fr") {
  if (billings.length === 0) return;
  const win = window.open("", "_blank", "width=820,height=920");
  if (!win) {
    alert(t("doc.popup_inv"));
    return;
  }
  win.document.write(buildInvoicesHTML(billings, t, lang));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

export function printInvoice(billing: StudentBilling, t: Translate, lang = "fr") {
  printInvoices([billing], t, lang);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

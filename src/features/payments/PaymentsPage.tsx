import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Receipt, Wallet, TriangleAlert, Bell } from "lucide-react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { computeStudentBilling } from "../../lib/billing";
import { printInvoice, printInvoices } from "../../lib/invoice";
import { formatDA, billingMonth } from "../../lib/format";
import PaymentManage from "./PaymentManage";
import type { Student } from "../../lib/types";

export default function PaymentsPage() {
  const { role } = useAuth();
  if (role === "student") return <StudentPayments />;
  return <AdminPayments />;
}

// ---- Admin: debt overview + per-student management ----
function AdminPayments() {
  const { t } = useTranslation();
  const { students, subjects, teachers, enrollments, sessions, payments } = useData();
  const markMonthPaid = useData((s) => s.markMonthPaid);
  const markMonthUnpaid = useData((s) => s.markMonthUnpaid);
  const [manage, setManage] = useState<Student | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const month = billingMonth();

  const rows = students
    .map((s) => ({
      student: s,
      billing: computeStudentBilling(s, enrollments, sessions, payments, { subjects, teachers }),
    }))
    .sort((a, b) => b.billing.totalDue - a.billing.totalDue);

  const totalDebt = rows.reduce((sum, r) => sum + r.billing.totalDue, 0);
  const totalCollected = rows.reduce((sum, r) => sum + r.billing.totalPaid, 0);

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.student.id));
  function toggle(id: string) {
    setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.student.id)));
  }
  function printSelected() {
    printInvoices(rows.filter((r) => selected.has(r.student.id)).map((r) => r.billing));
  }

  return (
    <div className="stack">
      <header className="page-head">
        <div className="page-title">
          <h1>{t("nav.payments")}</h1>
          <p>{t("pmt.subtitle", { month })}</p>
        </div>
        {selected.size > 0 && (
          <button className="btn btn-primary" onClick={printSelected}>
            <Receipt size={17} /> {t("pmt.print_selected", { n: selected.size })}
          </button>
        )}
      </header>

      <div className="grid-cards">
        <div className="card stat-card">
          <span className="stat-icon badge-green"><Wallet size={20} /></span>
          <div className="stat-body">
            <span className="stat-value text-ok">{formatDA(totalCollected)}</span>
            <span className="stat-label">{t("pmt.collected")}</span>
          </div>
        </div>
        <div className="card stat-card">
          <span className="stat-icon badge-red"><TriangleAlert size={20} /></span>
          <div className="stat-body">
            <span className="stat-value text-danger">{formatDA(totalDebt)}</span>
            <span className="stat-label">{t("dash.total_debt")}</span>
          </div>
        </div>
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th><input type="checkbox" checked={allSelected} onChange={toggleAll} title={t("pmt.select_all")} /></th>
              <th>{t("nav.students")}</th>
              <th>{t("nav.subjects")}</th>
              <th>{t("payments.paid")}</th>
              <th>{t("pmt.due")}</th>
              <th title={t("pmt.month_hint")}>{t("pmt.month_paid", { month })}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ student, billing }) => {
              const monthPayments = payments.filter((p) => p.studentId === student.id && p.month === month);
              const hasMonth = monthPayments.length > 0;
              const monthPaid = hasMonth && monthPayments.every((p) => p.status === "paid");
              return (
              <tr key={student.id}>
                <td><input type="checkbox" checked={selected.has(student.id)} onChange={() => toggle(student.id)} /></td>
                <td>
                  <div className="cell-id">
                    <span className="cell-avatar">{initials(student.name)}</span>
                    <strong>{student.name}</strong>
                  </div>
                </td>
                <td>{billing.subjects.length}</td>
                <td className="text-ok">{formatDA(billing.totalPaid)}</td>
                <td>{billing.totalDue > 0 ? <span className="text-danger">{formatDA(billing.totalDue)}</span> : <span className="text-ok">{t("stu.up_to_date")}</span>}</td>
                <td className="center">
                  <input
                    type="checkbox"
                    className="month-check"
                    disabled={!hasMonth}
                    checked={monthPaid}
                    title={hasMonth ? t("pmt.month_hint") : t("pmt.no_session_month")}
                    onChange={() => (monthPaid ? markMonthUnpaid(student.id, month) : markMonthPaid(student.id, month))}
                  />
                </td>
                <td className="row-actions">
                  <button className="btn btn-ghost sm" onClick={() => setManage(student)}>{t("pmt.manage")}</button>
                  <button className="icon-btn" title={t("pmt.invoice")} onClick={() => printInvoice(billing)}>
                    <Receipt size={16} />
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {manage && <PaymentManage student={manage} onClose={() => setManage(null)} />}
    </div>
  );
}

// ---- Student / parent: read-only billing, "session X of Y" ----
function StudentPayments() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { students, subjects, teachers, enrollments, sessions, payments } = useData();
  const student = students.find((s) => s.id === profile?.linkedStudentId);

  if (!student) return <p className="muted">{t("dash.no_student_link")}</p>;

  const billing = computeStudentBilling(student, enrollments, sessions, payments, { subjects, teachers });

  return (
    <div className="stack">
      <header className="page-head">
        <div className="page-title">
          <h1>{t("pmt.title_student")}</h1>
          <p>{student.name}</p>
        </div>
        <button className="btn btn-ghost" onClick={() => printInvoice(billing)}>
          <Receipt size={17} /> {t("pmt.invoice")}
        </button>
      </header>

      {billing.subjects.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon"><Wallet size={24} /></span>
            <strong>{t("pmt.no_enrolment")}</strong>
            <p>{t("pmt.no_enrolment_hint")}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="stack">
            {billing.subjects.map((s) => (
              <div key={s.enrollmentId} className="card billing-row">
                <div>
                  <strong>{s.subjectName}</strong>
                  <div className="muted small">{s.teacherName} · {formatDA(s.pricePerSession)}{t("pmt.per_session")}</div>
                  <div className="pill pill-soft">
                    {t("payments.session")} {s.currentSession} {t("payments.of")} {s.totalSessions}
                  </div>
                </div>
                <div className="billing-amounts">
                  {s.amountDue > 0 ? (
                    <>
                      <span className="pill pill-danger">{t("pmt.due")} : {formatDA(s.amountDue)}</span>
                      {s.reminderCount > 0 && (
                        <span className="muted small">
                          <Bell size={12} /> {t("pmt.reminders", { n: s.reminderCount })}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="pill pill-ok">{t("stu.up_to_date")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="total-line big">
            <span>{t("pmt.total_all")}</span>
            <strong className={billing.totalDue > 0 ? "text-danger" : "text-ok"}>{formatDA(billing.totalDue)}</strong>
          </div>
        </>
      )}
    </div>
  );
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

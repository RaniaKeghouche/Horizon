import { useTranslation } from "react-i18next";
import { Receipt, Check, Bell } from "lucide-react";
import Modal from "../../components/Modal";
import { useData } from "../../data/store";
import { computeStudentBilling } from "../../lib/billing";
import { printInvoice } from "../../lib/invoice";
import { formatDA, formatDate } from "../../lib/format";
import type { Student } from "../../lib/types";
import StackedTable from "../../components/StackedTable";

// Admin per-session payment manager (cahier §3.4): mark paid/unpaid, send reminders.
export default function PaymentManage({ student, onClose }: { student: Student; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const { subjects, teachers, enrollments, sessions, payments } = useData();
  const markPaid = useData((s) => s.markPaid);
  const markUnpaid = useData((s) => s.markUnpaid);
  const markMonthPaid = useData((s) => s.markMonthPaid);
  const sendReminder = useData((s) => s.sendReminder);

  const billing = computeStudentBilling(student, enrollments, sessions, payments, { subjects, teachers });
  const myPayments = payments
    .filter((p) => p.studentId === student.id)
    .sort((a, b) => a.month.localeCompare(b.month));

  const subjOfPayment = (enrollmentId: string) => {
    const enr = enrollments.find((e) => e.id === enrollmentId);
    return subjects.find((s) => s.id === enr?.subjectId)?.name ?? "—";
  };
  const sessionDate = (sessionId: string) => {
    const sess = sessions.find((s) => s.id === sessionId);
    return sess ? formatDate(sess.date) : "—";
  };

  return (
    <Modal
      title={`Paiements — ${student.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={() => printInvoice(billing, t, i18n.language)}>
            <Receipt size={16} /> {t("pmt.invoice")}
          </button>
          <button className="btn btn-primary" onClick={onClose}>{t("pm.close")}</button>
        </>
      }
    >
      <div className="total-line">
        <span>{t("payments.totalDue")}</span>
        <strong className={billing.totalDue > 0 ? "text-danger" : "text-ok"}>{formatDA(billing.totalDue)}</strong>
      </div>

      {/* Quick "mark the whole month paid" for months that still have unpaid sessions. */}
      {(() => {
        const unpaidMonths = [...new Set(myPayments.filter((p) => p.status === "unpaid").map((p) => p.month))].sort();
        if (unpaidMonths.length === 0) return null;
        return (
          <div className="month-pay-row">
            <span className="muted small">{t("pm.collect_month")}</span>
            {unpaidMonths.map((m) => (
              <button key={m} className="btn btn-primary sm" onClick={() => markMonthPaid(student.id, m)}>
                <Check size={14} /> {t("pmt.month_paid", { month: m })}
              </button>
            ))}
          </div>
        );
      })()}

      <StackedTable wrapClassName="card">
          <thead>
            <tr><th>{t("cf.subject")}</th><th>{t("payments.session")}</th><th>{t("pm.amount")}</th><th>{t("stu.status")}</th><th>{t("pm.reminders")}</th><th></th></tr>
          </thead>
          <tbody>
            {myPayments.map((p) => (
              <tr key={p.id}>
                <td>{subjOfPayment(p.enrollmentId)}</td>
                <td>{sessionDate(p.sessionId)}</td>
                <td>{formatDA(p.amount)}</td>
                <td>
                  <span className={"pill " + (p.status === "paid" ? "pill-ok" : "pill-danger")}>
                    {p.status === "paid" ? t("payments.paid") : t("payments.unpaid")}
                  </span>
                </td>
                <td>
                  {p.reminderCount > 0
                    ? <span className="cell-phone"><Bell size={12} /> {p.reminderCount}</span>
                    : "—"}
                </td>
                <td className="row-actions">
                  {p.status === "unpaid" ? (
                    <>
                      <button className="btn btn-primary sm" onClick={() => markPaid(p.id)}>{t("pm.mark_paid")}</button>
                      <button className="btn btn-ghost sm" onClick={() => sendReminder(p.id)}>{t("pm.remind")}</button>
                    </>
                  ) : (
                    <button className="btn btn-ghost sm" onClick={() => markUnpaid(p.id)}>{t("pm.undo")}</button>
                  )}
                </td>
              </tr>
            ))}
            {myPayments.length === 0 && <tr><td colSpan={6} className="muted center">{t("pm.none")}</td></tr>}
          </tbody>
      </StackedTable>
      <p className="muted small">
        {t("pm.tip_stops_reminders")}
      </p>
    </Modal>
  );
}

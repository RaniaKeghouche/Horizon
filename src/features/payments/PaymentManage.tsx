import { Fragment } from "react";
import Modal from "../../components/Modal";
import { useData } from "../../data/store";
import { computeStudentBilling } from "../../lib/billing";
import { printInvoice } from "../../lib/invoice";
import { formatDA, formatDate } from "../../lib/format";
import type { Student } from "../../lib/types";

// Admin per-session payment manager (cahier §3.4): mark paid/unpaid, send reminders.
export default function PaymentManage({ student, onClose }: { student: Student; onClose: () => void }) {
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
  /** "n° 3" — which session of the group this payment covers. */
  const sessionNo = (sessionId: string) => sessions.find((s) => s.id === sessionId)?.sessionNumber;

  // Grouped by billing month so the admin reads it the way they collect it:
  // one month at a time, with what is still owed for that month.
  const byMonth = myPayments.reduce<Record<string, typeof myPayments>>((acc, p) => {
    (acc[p.month] ??= []).push(p);
    return acc;
  }, {});
  const months = Object.keys(byMonth).sort();

  return (
    <Modal
      title={`Paiements — ${student.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={() => printInvoice(billing)}>🧾 Facture PDF</button>
          <button className="btn btn-primary" onClick={onClose}>Fermer</button>
        </>
      }
    >
      <div className="total-line">
        <span>Total dû</span>
        <strong className={billing.totalDue > 0 ? "text-danger" : "text-ok"}>{formatDA(billing.totalDue)}</strong>
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Matière</th>
              <th>Séance</th>
              <th>Montant</th>
              <th>Statut</th>
              <th>Payé le</th>
              <th>Rappels</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => {
              const rows = byMonth[m];
              const due = rows.filter((p) => p.status === "unpaid").reduce((s, p) => s + p.amount, 0);
              const paidCount = rows.filter((p) => p.status === "paid").length;
              return (
                <Fragment key={m}>
                  {/* Month banner: how much of this month is settled, at a glance. */}
                  <tr className="pay-month-row">
                    <td colSpan={7}>
                      <div className="pay-month">
                        <strong>{m}</strong>
                        <span className="muted small">
                          {paidCount}/{rows.length} séance(s) payée(s)
                        </span>
                        {due > 0 ? (
                          <span className="pill pill-danger">reste {formatDA(due)}</span>
                        ) : (
                          <span className="pill pill-ok">soldé</span>
                        )}
                        {due > 0 && (
                          <button
                            className="btn btn-primary sm mr-auto"
                            onClick={() => markMonthPaid(student.id, m)}
                          >
                            Encaisser le mois
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {rows.map((p) => {
                    const no = sessionNo(p.sessionId);
                    return (
                      <tr key={p.id}>
                        <td>{subjOfPayment(p.enrollmentId)}</td>
                        <td>
                          {no != null && <span className="pill pill-soft">n° {no}</span>}{" "}
                          {sessionDate(p.sessionId)}
                        </td>
                        <td>{formatDA(p.amount)}</td>
                        <td>
                          <span className={"pill " + (p.status === "paid" ? "pill-ok" : "pill-danger")}>
                            {p.status === "paid" ? "Payé" : "Non payé"}
                          </span>
                        </td>
                        {/* When the money actually came in. */}
                        <td className={p.paidAt ? "" : "muted"}>
                          {p.paidAt ? formatDate(p.paidAt) : "—"}
                        </td>
                        <td>{p.reminderCount > 0 ? `${p.reminderCount}` : "—"}</td>
                        <td className="row-actions">
                          {p.status === "unpaid" ? (
                            <>
                              <button className="btn btn-primary sm" onClick={() => markPaid(p.id)}>
                                Marquer payé
                              </button>
                              <button className="btn btn-ghost sm" onClick={() => sendReminder(p.id)}>
                                Relancer
                              </button>
                            </>
                          ) : (
                            <button className="btn btn-ghost sm" onClick={() => markUnpaid(p.id)}>
                              Annuler
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
            {myPayments.length === 0 && (
              <tr>
                <td colSpan={7} className="muted center">Aucun paiement.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        Astuce : marquer une séance comme payée arrête automatiquement les relances de cette matière.
      </p>
    </Modal>
  );
}

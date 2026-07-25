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
            <tr><th>Matière</th><th>Séance</th><th>Montant</th><th>Statut</th><th>Rappels</th><th></th></tr>
          </thead>
          <tbody>
            {myPayments.map((p) => (
              <tr key={p.id}>
                <td>{subjOfPayment(p.enrollmentId)}</td>
                <td>{sessionDate(p.sessionId)}</td>
                <td>{formatDA(p.amount)}</td>
                <td>
                  <span className={"pill " + (p.status === "paid" ? "pill-ok" : "pill-danger")}>
                    {p.status === "paid" ? "Payé" : "Non payé"}
                  </span>
                </td>
                <td>{p.reminderCount > 0 ? `🔔 ${p.reminderCount}` : "—"}</td>
                <td className="row-actions">
                  {p.status === "unpaid" ? (
                    <>
                      <button className="btn btn-primary sm" onClick={() => markPaid(p.id)}>Marquer payé</button>
                      <button className="btn btn-ghost sm" onClick={() => sendReminder(p.id)}>Relancer</button>
                    </>
                  ) : (
                    <button className="btn btn-ghost sm" onClick={() => markUnpaid(p.id)}>Annuler</button>
                  )}
                </td>
              </tr>
            ))}
            {myPayments.length === 0 && <tr><td colSpan={6} className="muted center">Aucun paiement.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        Astuce : marquer une séance comme payée arrête automatiquement les relances de cette matière.
      </p>
    </Modal>
  );
}

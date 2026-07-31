import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { computeStudentBilling } from "../../lib/billing";
import { printInvoice, printInvoices } from "../../lib/invoice";
import { formatDA } from "../../lib/format";
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
  const [manage, setManage] = useState<Student | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
      <div className="page-head">
        <h1>{t("nav.payments")}</h1>
        {selected.size > 0 && (
          <button className="btn btn-primary" onClick={printSelected}>🧾 Imprimer {selected.size} facture(s)</button>
        )}
      </div>

      <div className="grid-cards">
        <div className="card stat-card">
          <span className="stat-icon badge-green">💰</span>
          <div className="stat-body"><span className="stat-value text-ok">{formatDA(totalCollected)}</span><span className="stat-label">Encaissé</span></div>
        </div>
        <div className="card stat-card">
          <span className="stat-icon badge-amber">⚠️</span>
          <div className="stat-body"><span className="stat-value text-danger">{formatDA(totalDebt)}</span><span className="stat-label">Dette totale</span></div>
        </div>
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th><input type="checkbox" checked={allSelected} onChange={toggleAll} title="Tout sélectionner" /></th>
              <th>Étudiant</th><th>Matières</th><th>Payé</th><th>Dû</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ student, billing }) => (
              <tr key={student.id}>
                <td><input type="checkbox" checked={selected.has(student.id)} onChange={() => toggle(student.id)} /></td>
                <td><strong>{student.name}</strong></td>
                <td>{billing.subjects.length}</td>
                <td className="text-ok">{formatDA(billing.totalPaid)}</td>
                <td>{billing.totalDue > 0 ? <span className="text-danger">{formatDA(billing.totalDue)}</span> : <span className="text-ok">À jour</span>}</td>
                <td className="row-actions">
                  <button className="btn btn-ghost sm" onClick={() => setManage(student)}>Gérer</button>
                  <button className="icon-btn" title="Facture PDF" onClick={() => printInvoice(billing)}>🧾</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {manage && <PaymentManage student={manage} onClose={() => setManage(null)} />}
    </div>
  );
}

// ---- Student / parent: read-only billing, "session X of Y" ----
function StudentPayments() {
  const { profile } = useAuth();
  const { students, subjects, teachers, enrollments, sessions, payments } = useData();
  const student = students.find((s) => s.id === profile?.linkedStudentId);

  if (!student) return <p className="muted">Aucun étudiant lié à ce compte.</p>;

  const billing = computeStudentBilling(student, enrollments, sessions, payments, { subjects, teachers });

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Mes paiements</h1>
        <button className="btn btn-ghost" onClick={() => printInvoice(billing)}>🧾 Facture PDF</button>
      </div>

      <div className="stack">
        {billing.subjects.map((s) => (
          <div key={s.enrollmentId} className="card billing-row">
            <div>
              <strong>{s.subjectName}</strong>
              <div className="muted small">{s.teacherName} · {formatDA(s.pricePerSession)}/séance</div>
              <div className="pill pill-soft">Séance {s.currentSession} sur {s.totalSessions}</div>
            </div>
            <div className="billing-amounts">
              {s.amountDue > 0 ? (
                <>
                  <span className="pill pill-danger">Dû : {formatDA(s.amountDue)}</span>
                  {s.reminderCount > 0 && <span className="muted small">🔔 {s.reminderCount} rappel(s)</span>}
                </>
              ) : (
                <span className="pill pill-ok">À jour</span>
              )}
            </div>
          </div>
        ))}
        {billing.subjects.length === 0 && <p className="muted">Aucune inscription.</p>}
      </div>

      <div className="total-line big">
        <span>Total dû (toutes matières)</span>
        <strong className={billing.totalDue > 0 ? "text-danger" : "text-ok"}>{formatDA(billing.totalDue)}</strong>
      </div>
    </div>
  );
}

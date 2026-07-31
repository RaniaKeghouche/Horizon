import { useMemo, useState } from "react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { teacherFinance, teacherStudentBreakdown } from "../../lib/billing";
import { formatDA, formatDate, billingMonth } from "../../lib/format";
import Modal from "../../components/Modal";
import type { Teacher } from "../../lib/types";

export default function PayrollPage() {
  const { role, profile } = useAuth();
  if (role === "teacher") return <TeacherPayroll teacherId={profile?.teacherId} />;
  return <AdminPayroll />;
}

// ---- Admin: pay teachers, paid/unpaid list ----
function AdminPayroll() {
  const { teachers, students, subjects, enrollments, payments, teacherPayouts } = useData();
  const payTeacher = useData((s) => s.payTeacher);
  const [detail, setDetail] = useState<Teacher | null>(null);
  const month = billingMonth();

  const rows = useMemo(
    () => teachers.map((t) => ({ teacher: t, fin: teacherFinance(t.id, enrollments, payments, teacherPayouts) })),
    [teachers, enrollments, payments, teacherPayouts]
  );

  const totalToPay = rows.reduce((s, r) => s + r.fin.remaining, 0);

  function pay(teacherId: string, amount: number) {
    if (amount <= 0) return;
    if (confirm(`Verser ${formatDA(amount)} à cet enseignant ?`)) payTeacher(teacherId, amount, month);
  }

  return (
    <div className="stack">
      <h1>Paie des enseignants</h1>

      <div className="grid-cards">
        <div className="card stat-card">
          <span className="stat-icon badge-amber">💸</span>
          <div className="stat-body"><span className="stat-value text-danger">{formatDA(totalToPay)}</span><span className="stat-label">Reste à verser (tous)</span></div>
        </div>
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr><th>Enseignant</th><th>Gagné</th><th>Versé</th><th>Reste à payer</th><th>Statut</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map(({ teacher, fin }) => (
              <tr key={teacher.id}>
                <td><strong>{teacher.name}</strong></td>
                <td>{formatDA(fin.earned)}</td>
                <td className="text-ok">{formatDA(fin.paidOut)}</td>
                <td>{fin.remaining > 0 ? <span className="text-danger">{formatDA(fin.remaining)}</span> : "—"}</td>
                <td>
                  {fin.remaining > 0
                    ? <span className="pill pill-danger">À payer</span>
                    : <span className="pill pill-ok">À jour</span>}
                </td>
                <td className="row-actions">
                  <button className="btn btn-ghost sm" onClick={() => setDetail(teacher)}>Détail</button>
                  <button className="btn btn-primary sm" disabled={fin.remaining <= 0} onClick={() => pay(teacher.id, fin.remaining)}>
                    Payer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <Modal title={`Détail — ${detail.name}`} onClose={() => setDetail(null)}>
          <p className="muted small">Élèves rattachés à cet enseignant et ce qu'ils lui rapportent.</p>
          <div className="card table-wrap">
            <table className="table">
              <thead><tr><th>Élève</th><th>Matière</th><th>Encaissé (part prof)</th><th>En attente</th></tr></thead>
              <tbody>
                {teacherStudentBreakdown(detail.id, students, enrollments, payments, subjects).map((b) => (
                  <tr key={b.student.id + b.subjectName}>
                    <td>{b.student.name}</td>
                    <td>{b.subjectName}</td>
                    <td className="text-ok">{formatDA(b.paidToTeacher)}</td>
                    <td>{b.pendingToTeacher > 0 ? <span className="text-danger">{formatDA(b.pendingToTeacher)}</span> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="section-title">Historique des paies</h3>
          <div className="stack">
            {teacherPayouts.filter((p) => p.teacherId === detail.id).map((p) => (
              <div key={p.id} className="billing-row">
                <div><strong>{formatDA(p.amount)}</strong><div className="muted small">{p.month} · {formatDate(p.paidAt)}</div></div>
                <span className={"pill " + (p.confirmedByTeacher ? "pill-ok" : "pill-warn")}>
                  {p.confirmedByTeacher ? "Confirmé par le prof" : "En attente de confirmation"}
                </span>
              </div>
            ))}
            {teacherPayouts.filter((p) => p.teacherId === detail.id).length === 0 && <p className="muted">Aucune paie versée.</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---- Teacher: my pay + confirm receipt ----
function TeacherPayroll({ teacherId }: { teacherId?: string }) {
  const { enrollments, payments, teacherPayouts } = useData();
  const confirmPayout = useData((s) => s.confirmPayout);
  if (!teacherId) return <p className="muted">Aucun enseignant lié à ce compte.</p>;

  const fin = teacherFinance(teacherId, enrollments, payments, teacherPayouts);
  const mine = teacherPayouts.filter((p) => p.teacherId === teacherId).sort((a, b) => b.paidAt - a.paidAt);

  return (
    <div className="stack">
      <h1>Ma paie</h1>
      <div className="grid-cards">
        <div className="card stat-card"><span className="stat-icon badge-green">💰</span><div className="stat-body"><span className="stat-value text-ok">{formatDA(fin.earned)}</span><span className="stat-label">Gagné (encaissé)</span></div></div>
        <div className="card stat-card"><span className="stat-icon badge-blue">✅</span><div className="stat-body"><span className="stat-value">{formatDA(fin.paidOut)}</span><span className="stat-label">Reçu de l'école</span></div></div>
        <div className="card stat-card"><span className="stat-icon badge-amber">⏳</span><div className="stat-body"><span className="stat-value text-danger">{formatDA(fin.remaining)}</span><span className="stat-label">En attente</span></div></div>
      </div>

      <h3 className="section-title">Versements reçus</h3>
      <div className="stack">
        {mine.map((p) => (
          <div key={p.id} className="card billing-row">
            <div><strong>{formatDA(p.amount)}</strong><div className="muted small">{p.month} · {formatDate(p.paidAt)}</div></div>
            {p.confirmedByTeacher
              ? <span className="pill pill-ok">✓ Confirmé</span>
              : <button className="btn btn-primary sm" onClick={() => confirmPayout(p.id)}>Confirmer réception</button>}
          </div>
        ))}
        {mine.length === 0 && <p className="muted">Aucun versement pour l'instant.</p>}
      </div>
    </div>
  );
}

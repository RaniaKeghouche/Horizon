import { useMemo } from "react";
import { useData } from "../../data/store";
import { usernameFromEmail } from "../../lib/username";
import { formatDate } from "../../lib/format";
import { LEVEL_LABEL } from "../../lib/labels";

// Admin reviews student/teacher self-registration requests: accept (opens the account
// + creates the record) or reject. In both cases an e-mail is sent to the applicant.
export default function RequestsPage() {
  const { registrationRequests, subjects } = useData();
  const approve = useData((s) => s.approveRegistration);
  const reject = useData((s) => s.rejectRegistration);

  const pending = useMemo(
    () => registrationRequests.filter((r) => r.status === "pending").sort((a, b) => a.createdAt - b.createdAt),
    [registrationRequests]
  );
  const decided = useMemo(
    () => registrationRequests.filter((r) => r.status !== "pending").sort((a, b) => (b.reviewedAt ?? 0) - (a.reviewedAt ?? 0)),
    [registrationRequests]
  );

  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? id;

  function onApprove(id: string) {
    const res = approve(id);
    if (res) alert(`Compte activé ✅ — ${res.name} peut maintenant se connecter.`);
  }
  function onReject(id: string) {
    if (!confirm("Refuser cette demande ?")) return;
    reject(id);
  }

  return (
    <div className="stack">
      <h1>Demandes d'inscription</h1>

      {pending.length === 0 && <p className="muted">Aucune demande en attente.</p>}

      <div className="stack">
        {pending.map((r) => (
          <div key={r.id} className="card req-card">
            <div className="req-info">
              <div className="req-head">
                <span className={"stat-icon " + (r.role === "teacher" ? "badge-violet" : "badge-blue")} style={{ width: 42, height: 42, fontSize: "1.2rem" }}>
                  {r.role === "teacher" ? "👨‍🏫" : "🎓"}
                </span>
                <div>
                  <strong>{r.name}</strong>
                  <div className="muted small">{r.role === "teacher" ? "Enseignant" : "Étudiant / Parent"} · {formatDate(r.createdAt)}</div>
                </div>
              </div>
              <div className="req-fields muted small">
                🆔 {usernameFromEmail(r.email)} · 📞 {r.phone}
                {r.role === "student" && <> · 🎓 {LEVEL_LABEL[r.level ?? "1as"]} · 👪 {r.parentName} ({r.parentPhone})</>}
                {r.role === "teacher" && <> · 📚 {(r.subjects ?? []).map(subjName).join(", ")}</>}
              </div>
            </div>
            <div className="row-actions">
              <button className="btn btn-primary sm" onClick={() => onApprove(r.id)}>✓ Accepter</button>
              <button className="btn btn-ghost sm" onClick={() => onReject(r.id)}>✕ Refuser</button>
            </div>
          </div>
        ))}
      </div>

      {decided.length > 0 && (
        <>
          <h3 className="section-title">Historique</h3>
          <div className="card table-wrap">
            <table className="table">
              <thead><tr><th>Nom</th><th>Rôle</th><th>Identifiant</th><th>Décision</th></tr></thead>
              <tbody>
                {decided.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.role === "teacher" ? "Enseignant" : "Étudiant"}</td>
                    <td className="muted">{usernameFromEmail(r.email)}</td>
                    <td><span className={"pill " + (r.status === "approved" ? "pill-ok" : "pill-danger")}>{r.status === "approved" ? "Acceptée" : "Refusée"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

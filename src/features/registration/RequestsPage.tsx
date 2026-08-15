import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import EnrollmentQueue from "./EnrollmentQueue";
import { useData } from "../../data/store";
import { usernameFromEmail } from "../../lib/username";
import { formatDate } from "../../lib/format";
import { LEVEL_LABEL } from "../../lib/labels";
import { 
  UserX, 
  GraduationCap, 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  Filter, 
  Check, 
  X,
  Search
} from "lucide-react";

export default function RequestsPage() {
  const { t } = useTranslation();
  const { registrationRequests, subjects } = useData();
  const approve = useData((s) => s.approveRegistration);
  const reject = useData((s) => s.rejectRegistration);

  const [filterRole, setFilterRole] = useState<"all" | "student" | "teacher">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const pending = useMemo(
    () => registrationRequests.filter((r) => r.status === "pending").sort((a, b) => a.createdAt - b.createdAt),
    [registrationRequests]
  );
  const decided = useMemo(
    () => registrationRequests
      .filter((r) => r.status !== "pending")
      .filter((r) => filterRole === "all" || r.role === filterRole)
      .filter((r) => r.name.toLowerCase().includes(searchTerm.toLowerCase()) || usernameFromEmail(r.email).toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => (b.reviewedAt ?? 0) - (a.reviewedAt ?? 0)),
    [registrationRequests, filterRole, searchTerm]
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
    <div className="stack reg-page-container">
      {/* Page Header */}
      <div className="reg-page-head">
        <h1 className="reg-page-title">Registration Management</h1>
        <p className="reg-page-subtitle">Review and process student and staff enrollments.</p>
      </div>

      {/* Top 2 Panels (Side by Side Grid) */}
      <div className="reg-grid-two-col">
        
        {/* Panel 1: Demandes d'Inscriptions (تسجيلات) */}
        <div className="card reg-panel-card">
          <div className="reg-panel-header">
            <h3 className="reg-panel-title">Demandes d'Inscriptions (تسجيلات)</h3>
          </div>
          <div className="reg-panel-divider"></div>
          <div className="reg-panel-body">
            <EnrollmentQueue />
          </div>
        </div>

        {/* Panel 2: Demandes de compte */}
        <div className="card reg-panel-card">
          <div className="reg-panel-header">
            <h3 className="reg-panel-title">Demandes de compte</h3>
          </div>
          <div className="reg-panel-divider"></div>
          <div className="reg-panel-body">
            {pending.length === 0 ? (
              <div className="reg-empty-state">
                <div className="reg-empty-icon-box">
                  <UserX size={28} />
                </div>
                <p className="reg-empty-text">Aucune demande en attente.</p>
              </div>
            ) : (
              <div className="reg-pending-stack">
                {pending.map((r) => (
                  <div key={r.id} className="reg-pending-item">
                    <div className="reg-pending-left">
                      <span className={`reg-role-avatar ${r.role === "teacher" ? "avatar-teacher" : "avatar-student"}`}>
                        {r.role === "teacher" ? <UserCheck size={18} /> : <GraduationCap size={18} />}
                      </span>
                      <div className="reg-pending-meta">
                        <strong className="reg-pending-name">{r.name}</strong>
                        <div className="reg-pending-sub">
                          {r.role === "teacher" ? "Enseignant" : "Étudiant"} · {formatDate(r.createdAt)}
                        </div>
                        <div className="reg-pending-fields">
                          🆔 {usernameFromEmail(r.email)} · 📞 {r.phone}
                          {r.role === "student" && <> · 🎓 {LEVEL_LABEL[r.level ?? "1as"]}</>}
                          {r.role === "teacher" && <> · 📚 {(r.subjects ?? []).map(subjName).join(", ")}</>}
                        </div>
                      </div>
                    </div>
                    <div className="reg-pending-actions">
                      <button className="btn btn-accept sm" onClick={() => onApprove(r.id)}>
                        <Check size={14} /> Accepter
                      </button>
                      <button className="btn btn-reject sm" onClick={() => onReject(r.id)}>
                        <X size={14} /> Refuser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Bottom Section: Historique Card */}
      <div className="card reg-history-card">
        <div className="reg-history-header">
          <div className="reg-history-title-group">
            <h3>Historique</h3>
          </div>
          <div className="reg-history-toolbar">
            <div className="reg-search-input-wrapper">
              <Search size={14} />
              <input 
                type="text" 
                placeholder="Rechercher..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
            <div className="reg-role-filter">
              <Filter size={15} className="filter-icon" />
              <select value={filterRole} onChange={(e) => setFilterRole(e.target.value as any)}>
                <option value="all">Tous les rôles</option>
                <option value="student">Étudiants</option>
                <option value="teacher">Enseignants</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table reg-history-table">
            <thead>
              <tr>
                <th>NOM</th>
                <th>RÔLE</th>
                <th>IDENTIFIANT</th>
                <th>DÉCISION</th>
              </tr>
            </thead>
            <tbody>
              {decided.map((r) => (
                <tr key={r.id}>
                  <td className="font-semibold text-dark">{r.name}</td>
                  <td>
                    <span className={`role-pill ${r.role === "teacher" ? "role-teacher" : "role-student"}`}>
                      {r.role === "teacher" ? <UserCheck size={13} /> : <GraduationCap size={13} />}
                      {r.role === "teacher" ? "Enseignant" : "Étudiant"}
                    </span>
                  </td>
                  <td className="text-muted font-mono">{usernameFromEmail(r.email)}</td>
                  <td>
                    <span className={`decision-badge ${r.status === "approved" ? "approved" : "rejected"}`}>
                      {r.status === "approved" ? (
                        <>
                          <CheckCircle2 size={16} /> Acceptée
                        </>
                      ) : (
                        <>
                          <XCircle size={16} /> Refusée
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
              {decided.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-6">
                    Aucun historique correspondant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Inbox, BookOpen, GraduationCap, Users, Phone, IdCard, Check, X, CircleCheck } from "lucide-react";
import { useData } from "../../data/store";
import { usernameFromEmail } from "../../lib/username";
import { formatDate } from "../../lib/format";
import { LEVEL_LABEL } from "../../lib/labels";

// Admin reviews student/teacher self-registration requests: accept (opens the account
// + creates the record) or reject. In both cases an e-mail is sent to the applicant.
export default function RequestsPage() {
  const { t } = useTranslation();
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

  const [flash, setFlash] = useState("");
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(""), 4000);
    return () => clearTimeout(id);
  }, [flash]);

  function onApprove(id: string) {
    const res = approve(id);
    if (res) setFlash(t("req.activated", { name: res.name }));
  }
  function onReject(id: string) {
    // Refus conservé derrière une confirmation : l'action est irréversible et
    // déclenche un e-mail au demandeur.
    if (!confirm(t("req.confirm_refuse"))) return;
    reject(id);
  }

  return (
    <div className="stack">
      <header className="page-head">
        <div className="page-title">
          <h1>{t("req.title")}</h1>
          <p>{pending.length > 0 ? t("req.pending_count", { n: pending.length }) : t("req.all_done")}</p>
        </div>
      </header>

      {flash && <p className="att-flash"><CircleCheck size={16} /> {flash}</p>}

      {pending.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon"><Inbox size={24} /></span>
            <strong>{t("req.none")}</strong>
            <p>{t("req.none_hint")}</p>
          </div>
        </div>
      ) : (
        <div className="stack">
          {pending.map((r) => (
            <div key={r.id} className="card req-card">
              <div className="req-info">
                <div className="req-head">
                  <span className={"stat-icon " + (r.role === "teacher" ? "badge-violet" : "badge-blue")}>
                    {r.role === "teacher" ? <BookOpen size={18} /> : <GraduationCap size={18} />}
                  </span>
                  <div>
                    <strong>{r.name}</strong>
                    <div className="muted small">{t(`roles.${r.role}`)} · {formatDate(r.createdAt)}</div>
                  </div>
                </div>
                <ul className="req-fields">
                  <li><IdCard size={13} /> {usernameFromEmail(r.email)}</li>
                  <li><Phone size={13} /> {r.phone}</li>
                  {r.role === "student" && (
                    <>
                      <li><GraduationCap size={13} /> {LEVEL_LABEL[r.level ?? "1as"]}</li>
                      <li><Users size={13} /> {r.parentName} ({r.parentPhone})</li>
                    </>
                  )}
                  {r.role === "teacher" && (
                    <li><BookOpen size={13} /> {(r.subjects ?? []).map(subjName).join(", ") || "—"}</li>
                  )}
                </ul>
              </div>
              <div className="row-actions">
                <button className="btn btn-primary sm" onClick={() => onApprove(r.id)}>
                  <Check size={15} /> {t("req.accept")}
                </button>
                <button className="btn btn-ghost sm" onClick={() => onReject(r.id)}>
                  <X size={15} /> {t("req.refuse")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {decided.length > 0 && (
        <>
          <h3 className="section-title">{t("req.history")}</h3>
          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("stu.name")}</th>
                  <th>{t("req.role")}</th>
                  <th>{t("req.login_id")}</th>
                  <th>{t("req.decision")}</th>
                </tr>
              </thead>
              <tbody>
                {decided.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{t(`roles.${r.role}`)}</td>
                    <td className="muted">{usernameFromEmail(r.email)}</td>
                    <td>
                      <span className={"pill " + (r.status === "approved" ? "pill-ok" : "pill-danger")}>
                        {r.status === "approved" ? t("req.accepted") : t("req.refused")}
                      </span>
                    </td>
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

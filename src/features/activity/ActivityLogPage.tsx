import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ScrollText } from "lucide-react";
import { useData } from "../../data/store";
import { formatDateTime } from "../../lib/format";

// Full audit trail (cahier §9 — every action logged: who, what, when).
export default function ActivityLogPage() {
  const { t } = useTranslation();
  const { activityLog, users, teachers } = useData();

  const rows = useMemo(
    () => [...activityLog].sort((a, b) => b.createdAt - a.createdAt),
    [activityLog]
  );

  function who(userId: string) {
    return (
      users.find((u) => u.id === userId)?.displayName ??
      teachers.find((t) => t.id === userId)?.name ??
      userId
    );
  }

  return (
    <div className="stack">
      <header className="page-head">
        <div className="page-title">
          <h1>{t("nav.activity")}</h1>
          <p>{t("act.subtitle")}</p>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon"><ScrollText size={24} /></span>
            <strong>{t("act.none")}</strong>
            <p>{t("act.none_hint")}</p>
          </div>
        </div>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t("act.when")}</th>
                <th>{t("act.who")}</th>
                <th>{t("act.action")}</th>
                <th>{t("act.details")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="muted small">{formatDateTime(a.createdAt)}</td>
                  <td>{who(a.userId)}</td>
                  <td><span className="pill pill-soft">{a.action}</span></td>
                  <td>{a.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

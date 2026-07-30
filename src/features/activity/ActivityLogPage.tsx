import { useMemo } from "react";
import { useData } from "../../data/store";
import { formatDateTime } from "../../lib/format";

// Full audit trail (cahier §9 — every action logged: who, what, when).
export default function ActivityLogPage() {
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
      <h1>Journal d'activité</h1>
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Quand</th>
              <th>Qui</th>
              <th>Action</th>
              <th>Détails</th>
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
            {rows.length === 0 && (
              <tr><td colSpan={4} className="muted center">Aucune activité enregistrée.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

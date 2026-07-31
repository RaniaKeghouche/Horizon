import { useTranslation } from "react-i18next";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { buildDigest } from "../../lib/digest";
import { formatDateTime } from "../../lib/format";
import type { NotificationType } from "../../lib/types";

const ICON: Record<NotificationType, string> = {
  attendance: "✅",
  payment_reminder: "💰",
  daily_digest: "📅",
  teacher_request: "🗓️",
  waiting_list: "🎟️",
  enrollment: "📝",
};

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { profile, role } = useAuth();
  const { notifications, classes, subjects, teachers, payments, slotRequests } = useData();
  const addNotification = useData((s) => s.addNotification);
  const markRead = useData((s) => s.markNotificationRead);
  const sendReminder = useData((s) => s.sendReminder);
  const resolveSlotRequest = useData((s) => s.resolveSlotRequest);

  const mine = notifications
    .filter((n) => n.userId === profile?.id)
    .sort((a, b) => b.createdAt - a.createdAt);

  const isAdmin = role === "admin";
  const pendingRequests = slotRequests.filter((r) => r.status === "pending");

  function generateDigest() {
    if (!profile) return;
    addNotification(profile.id, "daily_digest", buildDigest(classes, subjects, teachers));
  }

  // Simulate the automated recurring reminder pass (cahier §3.6).
  function runReminders() {
    const unpaid = payments.filter((p) => p.status === "unpaid");
    unpaid.forEach((p) => sendReminder(p.id));
    alert(`${unpaid.length} relance(s) envoyée(s).`);
  }

  return (
    <div className="stack">
      <div className="page-head">
        <h1>{t("nav.notifications")}</h1>
        {isAdmin && (
          <div className="row-actions">
            <button className="btn btn-ghost" onClick={generateDigest}>📅 Générer le digest</button>
            <button className="btn btn-ghost" onClick={runReminders}>💰 Lancer les relances</button>
          </div>
        )}
      </div>

      {isAdmin && pendingRequests.length > 0 && (
        <div className="card">
          <h3 className="section-title">Demandes de créneaux</h3>
          {pendingRequests.map((r) => {
            const teacher = teachers.find((t) => t.id === r.teacherId)?.name ?? "?";
            return (
              <div key={r.id} className="attend-row">
                <span>{teacher} — {r.dayOfWeek} {r.timeSlot}</span>
                <div className="row-actions">
                  <button className="btn btn-primary sm" onClick={() => resolveSlotRequest(r.id, "approved")}>Approuver</button>
                  <button className="btn btn-ghost sm" onClick={() => resolveSlotRequest(r.id, "rejected")}>Rejeter</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="stack">
        {mine.map((n) => (
          <div
            key={n.id}
            className={"card notif" + (n.read ? " read" : "")}
            onClick={() => !n.read && markRead(n.id)}
          >
            <span className="notif-icon">{ICON[n.type]}</span>
            <div className="notif-body">
              <div>{n.message}</div>
              <div className="muted small">{formatDateTime(n.createdAt)}</div>
            </div>
            {!n.read && <span className="dot" />}
          </div>
        ))}
        {mine.length === 0 && <p className="muted">Aucune notification.</p>}
      </div>
    </div>
  );
}

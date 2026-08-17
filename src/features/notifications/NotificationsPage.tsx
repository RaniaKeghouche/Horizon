import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CircleCheck, Wallet, CalendarDays, CalendarClock, Ticket, FilePlus, Bell,
  type LucideIcon,
} from "lucide-react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { buildDigest } from "../../lib/digest";
import { formatDateTime } from "../../lib/format";
import type { NotificationType } from "../../lib/types";

const ICON: Record<NotificationType, LucideIcon> = {
  attendance: CircleCheck,
  payment_reminder: Wallet,
  daily_digest: CalendarDays,
  teacher_request: CalendarClock,
  waiting_list: Ticket,
  enrollment: FilePlus,
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

  // Confirmation en ligne : alert() bloquait la page pour une simple info.
  const [flash, setFlash] = useState("");
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(""), 4000);
    return () => clearTimeout(id);
  }, [flash]);

  function generateDigest() {
    if (!profile) return;
    addNotification(profile.id, "daily_digest", buildDigest(classes, subjects, teachers));
  }

  // Passe manuelle des relances automatiques (cahier §3.6).
  function runReminders() {
    const unpaid = payments.filter((p) => p.status === "unpaid");
    unpaid.forEach((p) => sendReminder(p.id));
    setFlash(t("notif.reminders_sent", { n: unpaid.length }));
  }

  const unread = mine.filter((n) => !n.read).length;

  return (
    <div className="stack">
      <header className="page-head">
        <div className="page-title">
          <h1>{t("nav.notifications")}</h1>
          <p>{unread > 0 ? t("notif.unread", { n: unread }) : t("notif.all_read")}</p>
        </div>
        {isAdmin && (
          <div className="row-actions">
            <button className="btn btn-ghost" onClick={generateDigest}>
              <CalendarDays size={16} /> {t("notif.digest")}
            </button>
            <button className="btn btn-ghost" onClick={runReminders}>
              <Wallet size={16} /> {t("notif.run_reminders")}
            </button>
          </div>
        )}
      </header>

      {flash && (
        <p className="att-flash"><CircleCheck size={16} /> {flash}</p>
      )}

      {isAdmin && pendingRequests.length > 0 && (
        <div className="card">
          <h3 className="section-title"><CalendarClock size={16} /> {t("notif.slot_requests")}</h3>
          {pendingRequests.map((r) => {
            const teacher = teachers.find((tc) => tc.id === r.teacherId)?.name ?? "—";
            return (
              <div key={r.id} className="att-row">
                <span>{teacher} — {t(`days.${r.dayOfWeek}`)} {r.timeSlot}</span>
                <div className="row-actions">
                  <button className="btn btn-primary sm" onClick={() => resolveSlotRequest(r.id, "approved")}>
                    {t("notif.approve")}
                  </button>
                  <button className="btn btn-ghost sm" onClick={() => resolveSlotRequest(r.id, "rejected")}>
                    {t("notif.reject")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mine.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon"><Bell size={24} /></span>
            <strong>{t("notif.none")}</strong>
            <p>{t("notif.none_hint")}</p>
          </div>
        </div>
      ) : (
        <div className="stack">
          {mine.map((n) => {
            const Icon = ICON[n.type];
            return (
              <div
                key={n.id}
                className={"card notif" + (n.read ? " read" : "")}
                onClick={() => !n.read && markRead(n.id)}
              >
                <span className="notif-icon"><Icon size={18} /></span>
                <div className="notif-body">
                  <div>{n.message}</div>
                  <div className="muted small">{formatDateTime(n.createdAt)}</div>
                </div>
                {!n.read && <span className="dot" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

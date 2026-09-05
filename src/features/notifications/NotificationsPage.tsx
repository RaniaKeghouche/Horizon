import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CircleCheck, Wallet, CalendarDays, CalendarClock, Ticket, FilePlus, Bell, Send,
  type LucideIcon,
} from "lucide-react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { buildDigest } from "../../lib/digest";
import { liveNotifications } from "../../lib/notifications";
import { formatDateTime } from "../../lib/format";
import "./notifications.css";
import type { NotificationType } from "../../lib/types";

const ICON: Record<NotificationType, LucideIcon> = {
  attendance: CircleCheck,
  payment_reminder: Wallet,
  daily_digest: CalendarDays,
  teacher_request: CalendarClock,
  waiting_list: Ticket,
  enrollment: FilePlus,
};

/** Pastilles colorées de la maquette, ramenées à la gamme bleue de l'identité :
 *  navy, bleu, ciel, cyan, sarcelle, bleuet. Le rang de la carte choisit la
 *  teinte, si bien que la liste alterne comme sur le modèle. */
const TILES = [
  { bg: "#e7edf8", fg: "#2d5490" },
  { bg: "#e3f0fb", fg: "#1f6fa8" },
  { bg: "#e2f4f6", fg: "#17798a" },
  { bg: "#e6f1fd", fg: "#3667b5" },
  { bg: "#e9ecfa", fg: "#4257a8" },
  { bg: "#e0f2f1", fg: "#12756c" },
];

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { profile, role } = useAuth();
  const { notifications, classes, subjects, teachers, payments, slotRequests } = useData();
  const addNotification = useData((s) => s.addNotification);
  const markRead = useData((s) => s.markNotificationRead);
  const sendReminder = useData((s) => s.sendReminder);
  const resolveSlotRequest = useData((s) => s.resolveSlotRequest);

  // Les recapitulatifs des jours passes ne decrivent plus rien : ils sortent
  // de la liste et du compteur (cf. src/lib/notifications.ts).
  const mine = liveNotifications(notifications, profile?.id);

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
    // Un seul recapitulatif par jour : c'est en le regenerant plusieurs fois
    // que la liste se remplissait de doublons.
    if (mine.some((n) => n.type === "daily_digest")) {
      setFlash(t("notif.digest_exists"));
      return;
    }
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
    <div className="stack notif-page">
      <header className="page-head">
        <div className="page-title">
          <h1>{t("nav.notifications")}</h1>
          <div className="notif-accent" aria-hidden="true"><i /><b /></div>
          <p>{unread > 0 ? t("notif.unread", { n: unread }) : t("notif.all_read")}</p>
        </div>
        {isAdmin && (
          <div className="row-actions">
            <button className="btn btn-ghost" onClick={generateDigest}>
              <CalendarDays size={16} /> {t("notif.digest")}
            </button>
            <button className="btn btn-primary" onClick={runReminders}>
              <Send size={16} /> {t("notif.run_reminders")}
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
        <div className="notif-list">
          {mine.map((n, i) => {
            const Icon = ICON[n.type];
            const tile = TILES[i % TILES.length];
            return (
              <div
                key={n.id}
                className={"card notif" + (n.read ? " read" : "")}
                style={{ "--tile-bg": tile.bg, "--tile-fg": tile.fg } as React.CSSProperties}
                onClick={() => !n.read && markRead(n.id)}
              >
                <span className="notif-icon"><Icon size={22} /></span>
                <div className="notif-body">
                  <div className="notif-text">{n.message}</div>
                  <div className="notif-time">{formatDateTime(n.createdAt)}</div>
                </div>
                <Doodle seed={i} />
                {!n.read && <span className="dot" />}
              </div>
            );
          })}
        </div>
      )}

      {unread > 0 && (
        <>
          <Mascot />
          <span className="notif-mascot-badge" aria-hidden="true">{unread}</span>
        </>
      )}
    </div>
  );
}

/** Filigrane décoratif au bout de la carte. Trois motifs alternés, tracés au
 *  trait pour rester lisibles à 13 % d'opacité. */
function Doodle({ seed }: { seed: number }) {
  const which = seed % 3;
  return (
    <svg className="notif-doodle" viewBox="0 0 96 56" fill="none" aria-hidden="true">
      {which === 0 && (
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="14" y="10" width="40" height="36" rx="5" />
          <path d="M14 20h40M24 6v8M44 6v8M24 30h8M24 38h18" />
          <circle cx="72" cy="34" r="12" />
          <path d="M72 27v7l5 4" />
        </g>
      )}
      {which === 1 && (
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M10 44V26M24 44V14M38 44V32M52 44V20M66 44V30" />
          <path d="M4 50h80" />
          <circle cx="80" cy="16" r="9" />
          <path d="M76 16l3 3 5-6" />
        </g>
      )}
      {which === 2 && (
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 40V18a4 4 0 014-4h26l10 10v16a4 4 0 01-4 4H16a4 4 0 01-4-4z" />
          <path d="M42 14v10h10M22 28h18M22 36h12" />
          <path d="M64 22c0-5 4-9 9-9s9 4 9 9-4 9-9 9h-3l-6 5v-5" />
        </g>
      )}
    </svg>
  );
}

/** La grande cloche du coin bas de page. */
function Mascot() {
  return (
    <svg className="notif-mascot" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <path
        d="M60 18a26 26 0 0126 26v18l9 13a3 3 0 01-2.5 4.7h-65A3 3 0 0125 75l9-13V44a26 26 0 0126-26z"
        fill="currentColor"
        opacity="0.55"
      />
      <path d="M60 8v10" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path
        d="M49 86a11 11 0 0022 0"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M18 40l-9-5M22 24l-7-8M102 40l9-5M98 24l7-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

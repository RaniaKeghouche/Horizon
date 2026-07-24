import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";

// Role-aware home. Each role lands here and sees the summary that matters to them.
export default function DashboardPage() {
  const { t } = useTranslation();
  const { role, profile } = useAuth();

  return (
    <div className="stack">
      <h1>{t("nav.dashboard")}</h1>
      <p className="muted">
        {profile?.displayName} — {role && t(`roles.${role}`)}
      </p>

      <div className="grid-cards">
        {role === "admin" && (
          <>
            <StatCard icon="🎓" label={t("nav.students")} value="—" />
            <StatCard icon="👨‍🏫" label={t("nav.teachers")} value="—" />
            <StatCard icon="💰" label={t("payments.totalDue")} value="—" />
            <StatCard icon="🗓️" label={t("nav.schedule")} value="—" />
          </>
        )}
        {role === "teacher" && (
          <>
            <StatCard icon="🗓️" label={t("nav.schedule")} value="—" />
            <StatCard icon="✅" label={t("nav.attendance")} value="—" />
          </>
        )}
        {role === "student" && (
          <>
            <StatCard icon="💰" label={t("payments.totalDue")} value="—" />
            <StatCard icon="✅" label={t("nav.attendance")} value="—" />
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="card stat-card">
      <span className="stat-icon">{icon}</span>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

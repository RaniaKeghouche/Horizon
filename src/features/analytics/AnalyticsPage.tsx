import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Wallet, TriangleAlert, TrendingUp } from "lucide-react";
import { useData } from "../../data/store";
import { computeStudentBilling } from "../../lib/billing";
import { formatDA } from "../../lib/format";
import BarChart, { type Bar } from "../../components/BarChart";

// Revenue analytics (cahier §11): per month, per subject, school cut per teacher, debt.
export default function AnalyticsPage() {
  const { t } = useTranslation();
  const { students, teachers, subjects, enrollments, sessions, payments } = useData();

  const stats = useMemo(() => {
    const paid = payments.filter((p) => p.status === "paid");
    const collected = paid.reduce((sum, p) => sum + p.amount, 0);
    const debt = students.reduce(
      (sum, s) => sum + computeStudentBilling(s, enrollments, sessions, payments, { subjects, teachers }).totalDue,
      0
    );

    const byMonth = new Map<string, number>();
    const bySubject = new Map<string, number>();
    const schoolByTeacher = new Map<string, number>();

    for (const p of paid) {
      byMonth.set(p.month, (byMonth.get(p.month) ?? 0) + p.amount);
      const enr = enrollments.find((e) => e.id === p.enrollmentId);
      if (enr) {
        bySubject.set(enr.subjectId, (bySubject.get(enr.subjectId) ?? 0) + p.amount);
        schoolByTeacher.set(enr.teacherId, (schoolByTeacher.get(enr.teacherId) ?? 0) + p.schoolCut);
      }
    }

    const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "?";
    const teacherName = (id: string) => teachers.find((t) => t.id === id)?.name ?? "?";

    // Couleurs tirées des tokens : les dégradés violets d'origine étaient hors
    // de la palette navy + doré et juraient avec le reste de l'application.
    const monthBars: Bar[] = [...byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([m, v]) => ({ label: m, value: v, color: "var(--navy-600)" }));
    const subjectBars: Bar[] = [...bySubject.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, v]) => ({ label: subjName(id), value: v, color: "var(--gold-400)" }));
    const teacherBars: Bar[] = [...schoolByTeacher.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, v]) => ({ label: teacherName(id), value: v, color: "var(--color-success)" }));

    return { collected, debt, monthBars, subjectBars, teacherBars };
  }, [students, teachers, subjects, enrollments, sessions, payments]);

  return (
    <div className="stack">
      <header className="page-head">
        <div className="page-title">
          <h1>{t("nav.analytics")}</h1>
          <p>{t("ana.subtitle")}</p>
        </div>
      </header>

      <div className="grid-cards">
        <div className="card stat-card">
          <span className="stat-icon badge-green"><Wallet size={20} /></span>
          <div className="stat-body">
            <span className="stat-value text-ok">{formatDA(stats.collected)}</span>
            <span className="stat-label">{t("ana.collected")}</span>
          </div>
        </div>
        <div className="card stat-card">
          <span className="stat-icon badge-red"><TriangleAlert size={20} /></span>
          <div className="stat-body">
            <span className="stat-value text-danger">{formatDA(stats.debt)}</span>
            <span className="stat-label">{t("ana.debt")}</span>
          </div>
        </div>
      </div>

      {stats.monthBars.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon"><TrendingUp size={24} /></span>
            <strong>{t("ana.none")}</strong>
            <p>{t("ana.none_hint")}</p>
          </div>
        </div>
      ) : (
        <div className="analytics-grid">
          <div className="card">
            <h3 className="section-title">{t("ana.by_month")}</h3>
            <BarChart data={stats.monthBars} format={formatDA} />
          </div>
          <div className="card">
            <h3 className="section-title">{t("ana.by_subject")}</h3>
            <BarChart data={stats.subjectBars} format={formatDA} />
          </div>
          <div className="card">
            <h3 className="section-title">{t("ana.school_cut")}</h3>
            <BarChart data={stats.teacherBars} format={formatDA} />
          </div>
        </div>
      )}
    </div>
  );
}

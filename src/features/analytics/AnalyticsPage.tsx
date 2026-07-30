import { useMemo } from "react";
import { useData } from "../../data/store";
import { computeStudentBilling } from "../../lib/billing";
import { formatDA } from "../../lib/format";
import BarChart, { type Bar } from "../../components/BarChart";

// Revenue analytics (cahier §11): per month, per subject, school cut per teacher, debt.
export default function AnalyticsPage() {
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

    const monthBars: Bar[] = [...byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([m, v]) => ({ label: m, value: v, color: "linear-gradient(90deg,#6f63f4,#5b53e8)" }));
    const subjectBars: Bar[] = [...bySubject.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, v]) => ({ label: subjName(id), value: v, color: "linear-gradient(90deg,#5b93ff,#3b6ef0)" }));
    const teacherBars: Bar[] = [...schoolByTeacher.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, v]) => ({ label: teacherName(id), value: v, color: "linear-gradient(90deg,#34d17f,#12b76a)" }));

    return { collected, debt, monthBars, subjectBars, teacherBars };
  }, [students, teachers, subjects, enrollments, sessions, payments]);

  return (
    <div className="stack">
      <h1>Analytique</h1>

      <div className="grid-cards">
        <div className="card stat-card">
          <span className="stat-icon badge-green">💰</span>
          <div className="stat-body"><span className="stat-value text-ok">{formatDA(stats.collected)}</span><span className="stat-label">Total encaissé</span></div>
        </div>
        <div className="card stat-card">
          <span className="stat-icon badge-amber">⚠️</span>
          <div className="stat-body"><span className="stat-value text-danger">{formatDA(stats.debt)}</span><span className="stat-label">Dette en cours</span></div>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="card">
          <h3 className="section-title">Revenus par mois</h3>
          <BarChart data={stats.monthBars} format={formatDA} />
        </div>
        <div className="card">
          <h3 className="section-title">Revenus par matière</h3>
          <BarChart data={stats.subjectBars} format={formatDA} />
        </div>
        <div className="card">
          <h3 className="section-title">Part école par enseignant</h3>
          <BarChart data={stats.teacherBars} format={formatDA} />
        </div>
      </div>
    </div>
  );
}

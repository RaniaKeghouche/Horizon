import { useTranslation } from "react-i18next";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { computeStudentBilling } from "../../lib/billing";
import { buildDigest, dayEnum } from "../../lib/digest";
import { formatDA } from "../../lib/format";
import { DAY_LABEL } from "../../lib/labels";

// Role-aware home. Each role lands here and sees the summary that matters to them.
export default function DashboardPage() {
  const { role, profile } = useAuth();
  const data = useData();

  return (
    <div className="stack">
      <h1>Bonjour, {profile?.displayName}</h1>

      {role === "admin" && <AdminHome />}
      {role === "teacher" && <TeacherHome teacherId={profile?.teacherId} />}
      {role === "student" && <StudentHome linkedStudentId={profile?.linkedStudentId} />}

      <div className="muted small">
        Aujourd'hui : {DAY_LABEL[dayEnum(new Date())]} — {data.classes.length} classes au total.
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: string; label: string; value: string; tone?: string }) {
  return (
    <div className="card stat-card">
      <span className="stat-icon">{icon}</span>
      <span className={"stat-value " + (tone ?? "")}>{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function AdminHome() {
  const { t } = useTranslation();
  const { students, teachers, classes, subjects, enrollments, sessions, payments } = useData();

  const totalDebt = students.reduce(
    (sum, s) => sum + computeStudentBilling(s, enrollments, sessions, payments, { subjects, teachers }).totalDue,
    0
  );
  const digest = buildDigest(classes, subjects, teachers);

  return (
    <>
      <div className="grid-cards">
        <StatCard icon="🎓" label={t("nav.students")} value={String(students.length)} />
        <StatCard icon="👨‍🏫" label={t("nav.teachers")} value={String(teachers.length)} />
        <StatCard icon="🗓️" label={t("nav.schedule")} value={`${classes.length} classes`} />
        <StatCard icon="⚠️" label="Dette totale" value={formatDA(totalDebt)} tone="text-danger" />
      </div>
      <div className="card digest-card">
        <strong>📅 Programme</strong>
        <p className="muted">{digest}</p>
      </div>
    </>
  );
}

function TeacherHome({ teacherId }: { teacherId?: string }) {
  const { classes, subjects, sessions } = useData();
  const myClasses = classes.filter((c) => c.teacherId === teacherId);
  const today = dayEnum(new Date());
  const todays = myClasses.filter((c) => c.dayOfWeek === today);
  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "?";

  return (
    <>
      <div className="grid-cards">
        <StatCard icon="🗓️" label="Mes classes" value={String(myClasses.length)} />
        <StatCard icon="📅" label="Aujourd'hui" value={String(todays.length)} />
        <StatCard icon="✅" label="Séances tenues" value={String(sessions.filter((s) => myClasses.some((c) => c.id === s.classId)).length)} />
      </div>
      <div className="card">
        <strong>Mes classes d'aujourd'hui</strong>
        {todays.length === 0 ? (
          <p className="muted">Aucune classe aujourd'hui.</p>
        ) : (
          <ul className="clean-list">
            {todays.map((c) => (
              <li key={c.id}>⏰ {c.timeSlot} — {subjName(c.subjectId)}</li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function StudentHome({ linkedStudentId }: { linkedStudentId?: string }) {
  const { students, subjects, teachers, enrollments, sessions, payments } = useData();
  const student = students.find((s) => s.id === linkedStudentId);
  if (!student) return <p className="muted">Aucun étudiant lié.</p>;

  const billing = computeStudentBilling(student, enrollments, sessions, payments, { subjects, teachers });

  return (
    <>
      <div className="grid-cards">
        <StatCard icon="📚" label="Matières" value={String(billing.subjects.length)} />
        <StatCard icon="💰" label="Total dû" value={formatDA(billing.totalDue)} tone={billing.totalDue > 0 ? "text-danger" : "text-ok"} />
        <StatCard icon="✅" label="Payé" value={formatDA(billing.totalPaid)} tone="text-ok" />
      </div>
      <div className="card">
        <strong>Où en suis-je ?</strong>
        <ul className="clean-list">
          {billing.subjects.map((s) => (
            <li key={s.enrollmentId}>
              {s.subjectName} — séance {s.currentSession}/{s.totalSessions}
              {s.amountDue > 0 ? ` · dû ${formatDA(s.amountDue)}` : " · à jour"}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

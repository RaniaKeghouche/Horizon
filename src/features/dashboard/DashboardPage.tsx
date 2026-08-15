import { useTranslation } from "react-i18next";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { computeStudentBilling } from "../../lib/billing";
import { buildDigest, dayEnum } from "../../lib/digest";
import { formatDA } from "../../lib/format";
import { DAY_LABEL } from "../../lib/labels";
import { DEMO_MODE } from "../../lib/config";
import { refetchAll } from "../../data/firebaseSync";
import type { LucideIcon } from "lucide-react";
import {
  GraduationCap, Users, CalendarDays, Wallet, CalendarClock,
  CircleCheck, BookOpen, Clock, CalendarRange, DatabaseZap, RefreshCw,
} from "lucide-react";

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

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  color = "navy",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: string;
  color?: string;
}) {
  return (
    <div className="card stat-card">
      <span className={"stat-icon badge-" + color} aria-hidden="true"><Icon size={22} /></span>
      <div className="stat-body">
        <span className={"stat-value " + (tone ?? "")}>{value}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}

function AdminHome() {
  const { t } = useTranslation();
  const { students, teachers, classes, subjects, enrollments, sessions, payments } = useData();
  const loadDemoData = useData((s) => s.loadDemoData);

  const totalDebt = students.reduce(
    (sum, s) => sum + computeStudentBilling(s, enrollments, sessions, payments, { subjects, teachers }).totalDue,
    0
  );
  const digest = buildDigest(classes, subjects, teachers);

  return (
    <>
      <div className="grid-cards">
        <StatCard icon={GraduationCap} label={t("nav.students")} value={String(students.length)} color="navy" />
        <StatCard icon={Users} label={t("nav.teachers")} value={String(teachers.length)} color="sky" />
        <StatCard icon={CalendarDays} label={t("nav.schedule")} value={`${classes.length} classes`} color="gold" />
        <StatCard icon={Wallet} label="Dette totale" value={formatDA(totalDebt)} tone="text-danger" color="warn" />
      </div>
      {/* Fresh Supabase projects start empty — this seeds recognisable demo rows
          (ids t1, s1, rm_big, ...) that supabase/DELETE-DEMO-DATA.sql removes. */}
      {students.length === 0 && (
        <div className="card">
          <strong>Aucune donnée</strong>
          <p className="muted">
            {DEMO_MODE
              ? "Chargez un jeu de données de démonstration pour explorer l'application."
              : "La base est vide, ou la synchronisation n'a rien reçu. Rechargez depuis Supabase, ou chargez des données de démo."}
          </p>
          <div className="add-row">
            {!DEMO_MODE && (
              <button className="btn btn-ghost" onClick={() => refetchAll()}>
                <RefreshCw size={16} /> Recharger depuis Supabase
              </button>
            )}
            <button className="btn btn-primary" onClick={() => loadDemoData()}>
              <DatabaseZap size={16} /> Charger les données de démo
            </button>
          </div>
        </div>
      )}

      {/* Realtime can be off (table not published, or a missing table rejected the
          channel). This pulls the current rows on demand. */}
      {!DEMO_MODE && students.length > 0 && (
        <button className="btn btn-ghost sm mr-auto" onClick={() => refetchAll()}>
          <RefreshCw size={14} /> Recharger depuis Supabase
        </button>
      )}

      <div className="card promo-card">
        <strong><CalendarRange size={18} aria-hidden="true" /> Programme</strong>
        <p>{digest}</p>
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
        <StatCard icon={CalendarDays} label="Mes classes" value={String(myClasses.length)} color="navy" />
        <StatCard icon={CalendarClock} label="Aujourd'hui" value={String(todays.length)} color="sky" />
        <StatCard icon={CircleCheck} label="Séances tenues" value={String(sessions.filter((s) => myClasses.some((c) => c.id === s.classId)).length)} color="green" />
      </div>
      <div className="card">
        <strong>Mes classes d'aujourd'hui</strong>
        {todays.length === 0 ? (
          <p className="muted">Aucune classe aujourd'hui.</p>
        ) : (
          <ul className="clean-list">
            {todays.map((c) => (
              <li key={c.id}><Clock size={14} aria-hidden="true" /> {c.timeSlot} — {subjName(c.subjectId)}</li>
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
        <StatCard icon={BookOpen} label="Matières" value={String(billing.subjects.length)} color="navy" />
        <StatCard icon={Wallet} label="Total dû" value={formatDA(billing.totalDue)} tone={billing.totalDue > 0 ? "text-danger" : "text-ok"} color={billing.totalDue > 0 ? "warn" : "success"} />
        <StatCard icon={CircleCheck} label="Payé" value={formatDA(billing.totalPaid)} tone="text-ok" color="success" />
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

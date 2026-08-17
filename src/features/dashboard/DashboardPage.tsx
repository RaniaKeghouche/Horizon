import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import {
  GraduationCap, Users, CalendarDays, BookOpen,
  ArrowRight, FileText, CheckCircle2,
  FlaskConical, Award, BarChart3, ClipboardList, Trophy,
} from "lucide-react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { computeStudentBilling } from "../../lib/billing";
import { dayEnum } from "../../lib/digest";
import { formatDA, formatDate } from "../../lib/format";
import { LEVEL_LABEL } from "../../lib/labels";
import type { LucideIcon } from "lucide-react";
import "./dashboard.css";

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { role, profile } = useAuth();

  // Intl plutôt que des tableaux de jours/mois écrits à la main : ces derniers
  // étaient en français en dur et affichaient « Samedi 15 août » y compris en
  // interface arabe. Intl suit la langue active, y compris pour le calendrier.
  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    [i18n.language]
  );

  const subtitle =
    role === "teacher" ? t("dash.subtitle_teacher")
    : role === "student" ? t("dash.subtitle_student")
    : t("dash.subtitle_admin");

  return (
    <div className="dash">
      <header className="dash-head">
        <div className="dash-greeting-wrap">
          <h1>{t("common.hello")}, {profile?.displayName || t("auth.welcome")} ! 👋</h1>
          <p className="dash-sub">{subtitle}</p>
        </div>

        <div className="dash-head-actions">
          <div className="dash-today-pill">
            <CalendarDays size={16} />
            <span>{formattedDate}</span>
          </div>
        </div>
      </header>

      {role === "admin" && <AdminHome />}
      {role === "teacher" && <TeacherHome teacherId={profile?.teacherId} />}
      {role === "student" && <StudentHome linkedStudentId={profile?.linkedStudentId} />}
    </div>
  );
}

/* ------------------------------------------------------------------ Briques */

type Tone = "gold" | "navy" | "green" | "violet" | "danger";

function StatTile({
  icon: Icon, label, value, tone = "navy", linkText, linkTo, sublabel,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: Tone;
  linkText?: string;
  linkTo?: string;
  sublabel?: string;
}) {
  return (
    <div className="dash-tile">
      <span className={"dash-tile-icon tone-" + tone}><Icon size={22} /></span>
      <div className="dash-tile-body">
        <div className="dash-tile-val-row">
          <strong>{value}</strong>
        </div>
        <span className="dash-tile-lbl">{label} {sublabel && <em>{sublabel}</em>}</span>
        {linkText && linkTo && (
          <NavLink to={linkTo} className="dash-tile-link">
            <span>{linkText}</span> <ArrowRight size={12} />
          </NavLink>
        )}
      </div>
    </div>
  );
}

function Panel({
  title, to, toLabel, children, empty,
}: {
  title: string;
  to?: string;
  toLabel?: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <section className="dash-panel">
      <header className="dash-panel-head">
        <h2>{title}</h2>
        {to && (
          <NavLink to={to} className="dash-panel-link">
            <span>{toLabel || t("dash.see_all")}</span> <ArrowRight size={14} />
          </NavLink>
        )}
      </header>
      {empty ? <p className="dash-empty">{t("dash.empty")}</p> : children}
    </section>
  );
}

function GoldProgress({ value }: { value: number }) {
  return (
    <div className="dash-progress-wrap">
      <div className="dash-progress-rail">
        <div className="dash-progress-bar" style={{ width: `${value}%` }} />
      </div>
      <span className="dash-progress-pct">{value}%</span>
    </div>
  );
}

/* ------------------------------------------------------------------ Teacher Dashboard (Image 2) */

function TeacherHome({ teacherId }: { teacherId?: string }) {
  const { t } = useTranslation();
  const { classes, sessions, subjects, enrollments } = useData();

  const myClasses = useMemo(() => classes.filter((c) => c.teacherId === teacherId), [classes, teacherId]);
  const myClassIds = new Set(myClasses.map((c) => c.id));
  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "—";

  const mySessionsAll = sessions.filter((s) => myClassIds.has(s.classId));
  const held = mySessionsAll.length;

  // Cinq dernières séances tenues, les plus récentes d'abord.
  const mySessions = [...mySessionsAll].sort((a, b) => b.date - a.date).slice(0, 5);

  const myStudentIds = new Set(
    enrollments.filter((e) => e.teacherId === teacherId).map((e) => e.studentId)
  );

  const today = dayEnum(new Date());
  const todays = myClasses
    .filter((c) => c.dayOfWeek === today)
    .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));

  // Taux de présence réel sur les séances de cet enseignant.
  const presenceRate = useMemo(() => {
    let marks = 0, present = 0;
    for (const s of mySessionsAll) {
      for (const st of Object.values(s.attendance)) {
        marks++;
        if (st === "present") present++;
      }
    }
    return marks > 0 ? Math.round((present / marks) * 100) : null;
  }, [mySessionsAll]);

  return (
    <>
      <div className="dash-tiles">
        <StatTile icon={Users} tone="gold" label={t("dash.my_groups")} sublabel={t("status.active")} value={String(myClasses.length)} />
        <StatTile icon={Users} tone="navy" label={t("dash.students_followed")} value={String(myStudentIds.size)} />
        <StatTile icon={CheckCircle2} tone="green" label={t("dash.sessions_held")} value={String(held)} />
        <StatTile
          icon={Award}
          tone="violet"
          label={t("dash.attendance_rate")}
          value={presenceRate === null ? "—" : `${presenceRate}%`}
        />
      </div>

      <div className="dash-layout">
        <div className="dash-main-cols">
          <Panel title={t("dash.my_groups")} to="/sessions" toLabel={t("dash.see_all")} empty={myClasses.length === 0}>
            <div className="dash-classes-list">
              {myClasses.map((c, i) => {
                const icons = [GraduationCap, BookOpen, FlaskConical];
                const Icon = icons[i % icons.length];
                const iconColor = ["gold", "navy", "green"][i % 3];
                return (
                  <div className="dash-class-card" key={c.id}>
                    <span className={"dash-class-icon tone-" + iconColor}><Icon size={20} /></span>
                    <div className="dash-class-info">
                      <strong>{subjName(c.subjectId)} · {LEVEL_LABEL[c.level]}</strong>
                      <span>{t("dash.students_count", { count: c.currentStudents })}</span>
                    </div>
                    <div className="dash-class-meta">
                      <em>{t("dash.next_class")}</em>
                      <span>{t(`days.${c.dayOfWeek}`)} {c.timeSlot}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Journal réel de l'enseignant : les séances qu'il a tenues, les plus
              récentes d'abord. Remplace une liste d'activités fictives. */}
          <Panel title={t("nav.activity")} to="/sessions" toLabel={t("dash.see_all")} empty={mySessions.length === 0}>
            <div className="dash-activities-list">
              {mySessions.map((s) => {
                const c = classes.find((x) => x.id === s.classId);
                const marked = Object.keys(s.attendance).length;
                return (
                  <div className="dash-activity-item" key={s.id}>
                    <span className="dash-activity-icon tone-green"><CheckCircle2 size={18} /></span>
                    <div className="dash-activity-content">
                      <strong>{c ? subjName(c.subjectId) : "—"}</strong>
                      <p>{t("dash.students_count", { count: marked })}</p>
                    </div>
                    <span className="dash-activity-time">{formatDate(s.date)}</span>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        <div className="dash-side-col">
          <Panel title={t("dash.day_agenda")} to="/schedule" toLabel={t("dash.see_all")} empty={todays.length === 0}>
            <div className="dash-calendar-list">
              {todays.map((c) => (
                <div className="dash-cal-item" key={c.id}>
                  <span className="dash-cal-time">{c.timeSlot.split("-")[0]}</span>
                  <span className="dash-cal-dot" />
                  <div className="dash-cal-content">
                    <strong>{subjName(c.subjectId)}</strong>
                    <span>{LEVEL_LABEL[c.level]} · {t("dash.students_count", { count: c.currentStudents })}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Motivation card with Trophy */}
          <div className="dash-motivation-banner">
            <div className="dash-motiv-art">
              <span className="dash-trophy-icon">🏆</span>
            </div>
            <div className="dash-motiv-text">
              <h3>{t("dash.motiv_teacher_title")}</h3>
              <p>{t("dash.motiv_teacher_body")}</p>
            </div>
            <NavLink to="/payroll" className="dash-motiv-btn">
              <span>{t("dash.motiv_teacher_cta")}</span>
              <ArrowRight size={15} />
            </NavLink>
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ Student Dashboard (Image 2) */

function StudentHome({ linkedStudentId }: { linkedStudentId?: string }) {
  const { t } = useTranslation();

  const { students, subjects, teachers, classes, enrollments, sessions, payments } = useData();
  const student = students.find((s) => s.id === linkedStudentId);

  const billing = useMemo(
    () => (student ? computeStudentBilling(student, enrollments, sessions, payments, { subjects, teachers }) : null),
    [student, enrollments, sessions, payments, subjects, teachers]
  );

  const myClasses = useMemo(
    () =>
      enrollments
        .filter((e) => e.studentId === student?.id)
        .map((e) => classes.find((c) => c.id === e.classId))
        .filter((c): c is NonNullable<typeof c> => !!c),
    [enrollments, classes, student]
  );

  const today = dayEnum(new Date());
  const todays = myClasses
    .filter((c) => c.dayOfWeek === today)
    .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));

  // Taux de présence réel, calculé sur les cartes de présence des séances suivies.
  const attendance = useMemo(() => {
    if (!student) return { present: 0, total: 0 };
    const ids = new Set(myClasses.map((c) => c.id));
    const mine = sessions.filter((s) => ids.has(s.classId) && s.attendance[student.id]);
    return { present: mine.filter((s) => s.attendance[student.id] === "present").length, total: mine.length };
  }, [student, myClasses, sessions]);
  const rate = attendance.total > 0 ? Math.round((attendance.present / attendance.total) * 100) : null;

  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "—";
  const teacherName = (id: string) => teachers.find((x) => x.id === id)?.name ?? "—";

  if (!student || !billing) return <p className="dash-empty">{t("dash.no_student_link")}</p>;

  return (
    <>
      <div className="dash-tiles">
        <StatTile
          icon={BookOpen} tone="gold" label={t("dash.my_subjects")}
          value={String(billing.subjects.length)}
          linkText={t("dash.see_all")} linkTo="/courses"
        />
        <StatTile
          icon={ClipboardList} tone="navy" label={t("dash.today_count")}
          value={String(todays.length)}
          linkText={t("dash.see_all")} linkTo="/courses"
        />
        <StatTile
          icon={BarChart3} tone="green" label={t("dash.attendance_rate")}
          value={rate === null ? "—" : `${rate}%`}
          linkText={t("dash.see_all")} linkTo="/attendance"
        />
        <StatTile
          icon={Trophy} tone="violet" label={t("payments.totalDue")}
          value={formatDA(billing.totalDue)}
          linkText={t("dash.see_all")} linkTo="/payments"
        />
      </div>

      <div className="dash-layout">
        <div className="dash-main-cols">
          {/* Progression = séance X sur Y de la période de facturation. */}
          <Panel title={t("dash.my_subjects")} to="/courses" toLabel={t("dash.see_all")} empty={billing.subjects.length === 0}>
            <div className="dash-student-courses">
              {billing.subjects.map((s) => (
                <div className="dash-course-row" key={s.enrollmentId}>
                  <div className="dash-course-badge"><BookOpen size={18} /></div>
                  <div className="dash-course-details">
                    <strong>{s.subjectName}</strong>
                    <span>{s.teacherName}</span>
                  </div>
                  <div className="dash-course-prog">
                    <GoldProgress
                      value={s.totalSessions > 0 ? Math.round((s.currentSession / s.totalSessions) * 100) : 0}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title={t("nav.payments")} to="/payments" toLabel={t("dash.see_all")} empty={billing.subjects.length === 0}>
            <div className="dash-homework-list">
              {billing.subjects.map((s) => (
                <div className="dash-homework-item" key={s.enrollmentId}>
                  <span className={"dash-homework-icon tone-" + (s.amountDue > 0 ? "navy" : "green")}>
                    <FileText size={18} />
                  </span>
                  <div className="dash-homework-details">
                    <strong>{s.subjectName}</strong>
                    <p>{t("payments.session")} {s.currentSession} {t("payments.of")} {s.totalSessions}</p>
                  </div>
                  <span className="dash-due-badge">
                    {s.amountDue > 0 ? formatDA(s.amountDue) : t("payments.paid")}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="dash-side-col">
          <Panel title={t("dash.day_agenda")} to="/courses" toLabel={t("dash.see_all")} empty={todays.length === 0}>
            <div className="dash-calendar-list">
              {todays.map((c) => (
                <div className="dash-cal-item" key={c.id}>
                  <span className="dash-cal-time">{c.timeSlot.split("-")[0]}</span>
                  <span className="dash-cal-dot" />
                  <div className="dash-cal-content">
                    <strong>{subjName(c.subjectId)}</strong>
                  </div>
                  <span className="dash-cal-room">{teacherName(c.teacherId)}</span>
                </div>
              ))}
            </div>
          </Panel>

          {/* Motivation card with Rocket */}
          <div className="dash-motivation-banner dash-motiv-rocket">
            <div className="dash-motiv-rocket-art">
              <svg className="dash-orbit-doodle" viewBox="0 0 100 50" fill="none">
                <path d="M5 45 Q 40 40, 70 20 Q 85 10, 95 5" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />
              </svg>
              <span className="dash-rocket-emoji">🚀</span>
            </div>
            <div className="dash-motiv-text">
              <h3>{t("dash.motiv_student_title")}</h3>
              <p>{t("dash.motiv_student_body")}</p>
            </div>
            <NavLink to="/courses" className="dash-motiv-btn">
              <span>{t("dash.motiv_student_cta")}</span>
              <ArrowRight size={15} />
            </NavLink>
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ Admin Dashboard */

function AdminHome() {
  const { t } = useTranslation();
  const { students, teachers, classes, subjects, enrollments, sessions, payments, registrationRequests } = useData();

  const totalDebt = useMemo(
    () =>
      students.reduce(
        (sum, s) =>
          sum + computeStudentBilling(s, enrollments, sessions, payments, { subjects, teachers }).totalDue,
        0
      ),
    [students, enrollments, sessions, payments, subjects, teachers]
  );

  const pending = registrationRequests.filter((r) => r.status === "pending");

  return (
    <>
      <div className="dash-tiles">
        <StatTile icon={GraduationCap} tone="gold" label={t("nav.students")} value={String(students.length)} linkText={t("dash.see_all")} linkTo="/students" />
        <StatTile icon={Users} tone="navy" label={t("nav.teachers")} value={String(teachers.length)} linkText={t("dash.see_all")} linkTo="/teachers" />
        <StatTile icon={CalendarDays} tone="green" label={t("nav.sessions")} value={String(classes.length)} linkText={t("dash.see_all")} linkTo="/sessions" />
        <StatTile
          icon={Award}
          tone={totalDebt > 0 ? "danger" : "green"}
          label={t("nav.payments")}
          sublabel={t("tea.pending")}
          value={formatDA(totalDebt)}
          linkText={t("dash.see_all")}
          linkTo="/payments"
        />
      </div>

      <div className="dash-layout">
        <div className="dash-main-cols">
          <Panel title={t("req.title")} to="/requests" toLabel={t("dash.review")} empty={pending.length === 0}>
            <div className="dash-activities-list">
              {pending.slice(0, 5).map((r) => (
                <div className="dash-activity-item" key={r.id}>
                  <span className="dash-activity-icon tone-gold"><Users size={18} /></span>
                  <div className="dash-activity-content">
                    <strong>{r.name}</strong>
                    <p>{t(`roles.${r.role}`)} · {r.phone}</p>
                  </div>
                  <span className="dash-due-badge">{t("tea.pending")}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="dash-side-col">
          <div className="dash-motivation-banner">
            <div className="dash-trophy-icon">🏆</div>
            <div className="dash-motiv-text">
              <h3>{t("dash.motiv_admin_title")}</h3>
              <p>{t("dash.motiv_admin_body")}</p>
            </div>
            <NavLink to="/analytics" className="dash-motiv-btn">
              <span>{t("dash.motiv_admin_cta")}</span>
              <ArrowRight size={15} />
            </NavLink>
          </div>
        </div>
      </div>
    </>
  );
}

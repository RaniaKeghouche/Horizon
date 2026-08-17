import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import {
  GraduationCap, Users, CalendarDays, BookOpen,
  ArrowRight, FileText, CheckCircle2,
  FlaskConical, MoreVertical, Award, BarChart3, ClipboardList, Trophy,
} from "lucide-react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { computeStudentBilling } from "../../lib/billing";
import { formatDA } from "../../lib/format";
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
  const { classes, sessions } = useData();

  const myClasses = useMemo(() => classes.filter((c) => c.teacherId === teacherId), [classes, teacherId]);
  const myClassIds = new Set(myClasses.map((c) => c.id));

  const held = sessions.filter((s) => myClassIds.has(s.classId)).length;

  // Mock list items as fallback if fresh DB has few entries
  const classItems = myClasses.length > 0 ? myClasses : [
    { id: "c1", level: "3am", currentStudents: 25, subjectId: "s1", next: "Aujourd'hui, 10:00", name: "3ème A" },
    { id: "c2", level: "2as", currentStudents: 28, subjectId: "s1", next: "Aujourd'hui, 11:30", name: "2nde B" },
    { id: "c3", level: "1as", currentStudents: 23, subjectId: "s1", next: "Demain, 08:30", name: "1ère S" },
  ];

  const recentActivities = [
    { id: "a1", type: "check", title: "Devoir corrigé", sub: "Devoir n°4 – 3ème A", time: "Il y a 2 heures", icon: CheckCircle2, color: "green" },
    { id: "a2", type: "book", title: "Nouveau cours publié", sub: "Les fonctions linéaires – 2nde B", time: "Il y a 5 heures", icon: FileText, color: "blue" },
    { id: "a3", type: "eval", title: "Évaluation créée", sub: "Contrôle continu – 1ère S", time: "Il y a 1 jour", icon: CheckCircle2, color: "green" },
    { id: "a4", type: "res", title: "Ressource partagée", sub: "Exercices supplémentaires – 3ème A", time: "Il y a 2 jours", icon: BookOpen, color: "blue" },
  ];

  const calendarItems = [
    { id: "cal1", time: "08:00", title: "1ère S", sub: "Mathématiques", dotColor: "#94a3b8" },
    { id: "cal2", time: "10:00", title: "3ème A", sub: "Mathématiques", dotColor: "#f59e0b" },
    { id: "cal3", time: "11:30", title: "2nde B", sub: "Mathématiques", dotColor: "#3b82f6" },
    { id: "cal4", time: "14:00", title: "Réunion pédagogique", sub: "Salle des professeurs", dotColor: "#10b981" },
  ];

  return (
    <>
      {/* 4 Stat Tiles */}
      <div className="dash-tiles">
        <StatTile icon={Users} tone="gold" label="Classes" sublabel="Actives" value={String(Math.max(myClasses.length, 6))} />
        <StatTile icon={FileText} tone="navy" label="Cours" sublabel="Publiés" value={String(Math.max(myClasses.length * 4, 24))} />
        <StatTile icon={CheckCircle2} tone="green" label="Évaluations" sublabel="Corrigées" value={String(Math.max(held, 78))} />
        <StatTile icon={Award} tone="violet" label="Taux de réussite" sublabel="Moyen" value="92%" />
      </div>

      {/* Main Grid: Left 2 columns & Right 1 column */}
      <div className="dash-layout">
        <div className="dash-main-cols">
          {/* Mes classes */}
          <Panel title="Mes classes" to="/sessions" toLabel="Voir toutes">
            <div className="dash-classes-list">
              {classItems.map((c, i) => {
                const icons = [GraduationCap, BookOpen, FlaskConical];
                const Icon = icons[i % icons.length];
                const iconColors = ["gold", "navy", "green"];
                const iconColor = iconColors[i % iconColors.length];
                const title = "name" in c ? c.name : `${LEVEL_LABEL[c.level]}`;
                const nextTime = "next" in c ? c.next : "Aujourd'hui, 10:00";

                return (
                  <div className="dash-class-card" key={c.id}>
                    <span className={"dash-class-icon tone-" + iconColor}><Icon size={20} /></span>
                    <div className="dash-class-info">
                      <strong>{title}</strong>
                      <span>{c.currentStudents} élèves</span>
                    </div>
                    <div className="dash-class-meta">
                      <em>{t("dash.next_class")}</em>
                      <span>{nextTime}</span>
                    </div>
                    <button className="dash-class-more" aria-label="Options">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Activités récentes */}
          <Panel title="Activités récentes" to="/activity" toLabel="Voir tout">
            <div className="dash-activities-list">
              {recentActivities.map((act) => {
                const Icon = act.icon;
                return (
                  <div className="dash-activity-item" key={act.id}>
                    <span className={"dash-activity-icon tone-" + (act.color === "green" ? "green" : "navy")}>
                      <Icon size={18} />
                    </span>
                    <div className="dash-activity-content">
                      <strong>{act.title}</strong>
                      <p>{act.sub}</p>
                    </div>
                    <span className="dash-activity-time">{act.time}</span>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        {/* Right column */}
        <div className="dash-side-col">
          <Panel title="Calendrier du jour" to="/schedule" toLabel="Voir le calendrier">
            <div className="dash-calendar-list">
              {calendarItems.map((it) => (
                <div className="dash-cal-item" key={it.id}>
                  <span className="dash-cal-time">{it.time}</span>
                  <span className="dash-cal-dot" style={{ backgroundColor: it.dotColor }} />
                  <div className="dash-cal-content">
                    <strong>{it.title}</strong>
                    <span>{it.sub}</span>
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

function StudentHome({ linkedStudentId: _linkedStudentId }: { linkedStudentId?: string }) {
  const { t } = useTranslation();

  const studentCourses = [
    { id: "sc1", name: "Mathématiques", teacher: "M. Karim Belkacem", progress: 75, icon: "√x" },
    { id: "sc2", name: "Physique-Chimie", teacher: "Mme. Leila A.", progress: 60, icon: FlaskConical },
    { id: "sc3", name: "Français", teacher: "M. Samir D.", progress: 90, icon: BookOpen },
  ];

  const studentHomework = [
    { id: "hw1", title: "Devoir de mathématiques", sub: "Chapitre 4 – Fonctions", due: "16 mai", color: "blue" },
    { id: "hw2", title: "Exercices de physique", sub: "Les lois de Newton", due: "17 mai", color: "green" },
    { id: "hw3", title: "Rédaction – Français", sub: "Sujet libre", due: "20 mai", color: "blue" },
  ];

  const studentCalendar = [
    { id: "scal1", time: "10:00", title: "Mathématiques", room: "Salle 12", dotColor: "#f59e0b" },
    { id: "scal2", time: "11:30", title: "Physique-Chimie", room: "Salle 8", dotColor: "#3b82f6" },
    { id: "scal3", time: "14:00", title: "Anglais", room: "Salle 15", dotColor: "#10b981" },
  ];

  return (
    <>
      {/* 4 Stat Tiles */}
      <div className="dash-tiles">
        <StatTile
          icon={BookOpen}
          tone="gold"
          label="Cours aujourd'hui"
          value="5"
          linkText="Voir mon emploi du temps"
          linkTo="/courses"
        />
        <StatTile
          icon={ClipboardList}
          tone="navy"
          label="Devoirs à rendre"
          value="3"
          linkText="Voir mes devoirs"
          linkTo="/courses"
        />
        <StatTile
          icon={BarChart3}
          tone="green"
          label="Moyenne générale"
          value="85%"
          linkText="Voir mes notes"
          linkTo="/attendance"
        />
        <StatTile
          icon={Trophy}
          tone="violet"
          label="Badges"
          value="12"
          linkText="Voir mes badges"
          linkTo="/courses"
        />
      </div>

      {/* Main Grid: Left 2 columns & Right 1 column */}
      <div className="dash-layout">
        <div className="dash-main-cols">
          {/* Mes cours */}
          <Panel title="Mes cours" to="/courses" toLabel="Voir tous mes cours">
            <div className="dash-student-courses">
              {studentCourses.map((c) => (
                <div className="dash-course-row" key={c.id}>
                  <div className="dash-course-badge">
                    {typeof c.icon === "string" ? (
                      <span className="dash-math-sym">{c.icon}</span>
                    ) : (
                      <c.icon size={18} />
                    )}
                  </div>
                  <div className="dash-course-details">
                    <strong>{c.name}</strong>
                    <span>{c.teacher}</span>
                  </div>
                  <div className="dash-course-prog">
                    <GoldProgress value={c.progress} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Devoirs à venir */}
          <Panel title="Devoirs à venir" to="/courses" toLabel="Voir tous">
            <div className="dash-homework-list">
              {studentHomework.map((hw) => (
                <div className="dash-homework-item" key={hw.id}>
                  <span className={"dash-homework-icon tone-" + (hw.color === "green" ? "green" : "navy")}>
                    <FileText size={18} />
                  </span>
                  <div className="dash-homework-details">
                    <strong>{hw.title}</strong>
                    <p>{hw.sub}</p>
                  </div>
                  <span className="dash-due-badge">{hw.due}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Right column */}
        <div className="dash-side-col">
          <Panel title="Calendrier" to="/courses" toLabel="Voir le calendrier">
            <div className="dash-calendar-list">
              {studentCalendar.map((it) => (
                <div className="dash-cal-item" key={it.id}>
                  <span className="dash-cal-time">{it.time}</span>
                  <span className="dash-cal-dot" style={{ backgroundColor: it.dotColor }} />
                  <div className="dash-cal-content">
                    <strong>{it.title}</strong>
                  </div>
                  <span className="dash-cal-room">{it.room}</span>
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
        <StatTile icon={GraduationCap} tone="gold" label="Élèves inscrits" value={String(students.length)} linkText="Voir les élèves" linkTo="/students" />
        <StatTile icon={Users} tone="navy" label="Enseignants" value={String(teachers.length)} linkText="Voir les enseignants" linkTo="/teachers" />
        <StatTile icon={CalendarDays} tone="green" label="Groupes de cours" value={String(classes.length)} linkText="Gérer les groupes" linkTo="/sessions" />
        <StatTile
          icon={Award}
          tone={totalDebt > 0 ? "danger" : "green"}
          label="Paiements"
          sublabel="En attente"
          value={formatDA(totalDebt)}
          linkText="Voir les paiements"
          linkTo="/payments"
        />
      </div>

      <div className="dash-layout">
        <div className="dash-main-cols">
          <Panel title="Demandes d'inscription" to="/requests" toLabel="Traiter les demandes" empty={pending.length === 0}>
            <div className="dash-activities-list">
              {pending.slice(0, 5).map((r) => (
                <div className="dash-activity-item" key={r.id}>
                  <span className="dash-activity-icon tone-gold"><Users size={18} /></span>
                  <div className="dash-activity-content">
                    <strong>{r.name}</strong>
                    <p>{r.role === "teacher" ? "Candidature Enseignant" : "Inscription Élève"} · {r.phone}</p>
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

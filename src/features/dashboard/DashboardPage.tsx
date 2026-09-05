import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import Sparkline from "../../components/Sparkline";
import DiscoverPage from "../discover/DiscoverPage";
import {
  GraduationCap, Users, CalendarDays, BookOpen,
  ArrowRight, CheckCircle2,
  FlaskConical, Award, ClipboardList, Hand, Wallet,
  Plus, Inbox,
} from "lucide-react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { dayEnum } from "../../lib/digest";
import { formatDA, formatDate, billingMonth } from "../../lib/format";
import { cycleBalance } from "../../lib/cycles";
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
          <h1>{t("common.hello")}, {profile?.displayName || t("auth.welcome")} ! <Hand size={17} className="greet-wave" aria-hidden="true" /></h1>
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
      {role === "student" && <StudentHome />}
    </div>
  );
}

/* ------------------------------------------------------------------ Briques */

type Tone = "gold" | "navy" | "green" | "violet" | "danger";

/** La courbe prend la couleur de la pastille de sa tuile. */
const TILE_STROKE: Record<Tone, string> = {
  gold: "var(--viv-amber)",
  navy: "var(--viv-indigo)",
  green: "var(--viv-emerald)",
  violet: "var(--viv-violet)",
  danger: "var(--viv-rose)",
};

function StatTile({
  icon: Icon, label, value, tone = "navy", linkText, linkTo, sublabel, series, tinted = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: Tone;
  linkText?: string;
  linkTo?: string;
  sublabel?: string;
  /** Historique sur six mois. Absent ou tout a zero : aucune courbe tracee. */
  series?: number[];
  /** Fond pastel de la teinte, comme sur le tableau de bord enseignant. */
  tinted?: boolean;
}) {
  return (
    <div className={"dash-tile tone-" + tone + (tinted ? " tinted" : "")}>
      <div className="dash-tile-head">
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
      {series && <Sparkline values={series} tone={TILE_STROKE[tone]} />}
    </div>
  );
}

function Panel({
  title, to, toLabel, children, empty, badge, emptyIcon: EmptyIcon, emptyHint, emptyAction,
}: {
  title: string;
  to?: string;
  toLabel?: string;
  children: React.ReactNode;
  empty?: boolean;
  /** Small count shown beside the title, e.g. "3 tâches". */
  badge?: string;
  /** Illustration et precisions de l'etat vide : un panneau vide doit dire ce
   *  qui le remplira, pas seulement qu'il est vide. */
  emptyIcon?: LucideIcon;
  emptyHint?: string;
  emptyAction?: { to: string; label: string };
}) {
  const { t } = useTranslation();
  return (
    <section className="dash-panel">
      <header className="dash-panel-head">
        <h2>{title}</h2>
        {badge && <span className="dash-panel-badge">{badge}</span>}
        {to && (
          <NavLink to={to} className="dash-panel-link">
            <span>{toLabel || t("dash.see_all")}</span> <ArrowRight size={14} />
          </NavLink>
        )}
      </header>
      {empty ? (
        <div className="dash-blank">
          {EmptyIcon && (
            <span className="dash-blank-art" aria-hidden="true"><EmptyIcon size={30} /></span>
          )}
          <strong>{t("dash.empty")}</strong>
          {emptyHint && <p>{emptyHint}</p>}
          {emptyAction && (
            <NavLink to={emptyAction.to} className="btn btn-primary sm">
              <Plus size={15} /> {emptyAction.label}
            </NavLink>
          )}
        </div>
      ) : (
        children
      )}
    </section>
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

  /** Six mois d'historique reel, pour les courbes des vignettes. */
  const series = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) =>
      new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    );
    const endOf = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
    return {
      groups: months.map((d) => myClasses.filter((c) => c.createdAt <= endOf(d)).length),
      students: months.map((d) => {
        const ids = new Set(
          enrollments
            .filter((e) => e.teacherId === teacherId && e.startDate <= endOf(d))
            .map((e) => e.studentId)
        );
        return ids.size;
      }),
      sessions: months.map((d) => mySessionsAll.filter((x) => x.date <= endOf(d)).length),
      rate: months.map((d) => {
        let marks = 0, present = 0;
        for (const x of mySessionsAll.filter((x) => x.date <= endOf(d))) {
          for (const st of Object.values(x.attendance)) {
            marks++;
            if (st === "present") present++;
          }
        }
        return marks ? Math.round((present / marks) * 100) : 0;
      }),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myClasses, enrollments, mySessionsAll, teacherId]);


  return (
    <>
      <div className="dash-tiles">
        <StatTile icon={Users} tone="gold" label={t("dash.my_groups")} sublabel={t("status.active")} value={String(myClasses.length)} series={series.groups} tinted />
        <StatTile icon={Users} tone="navy" label={t("dash.students_followed")} value={String(myStudentIds.size)} series={series.students} tinted />
        <StatTile icon={CheckCircle2} tone="green" label={t("dash.sessions_held")} value={String(held)} series={series.sessions} tinted />
        <StatTile
          icon={Award}
          tone="violet"
          label={t("dash.attendance_rate")}
          value={presenceRate === null ? "—" : `${presenceRate}%`}
          series={series.rate}
          tinted
        />
      </div>

      <div className="dash-tri">
          <Panel
            title={t("dash.my_groups")}
            to="/sessions"
            toLabel={t("dash.see_all")}
            empty={myClasses.length === 0}
            emptyIcon={Users}
            emptyHint={t("dash.blank_groups")}
            emptyAction={{ to: "/schedule", label: t("dash.qa_group") }}
          >
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
          <Panel
            title={t("nav.activity")}
            to="/sessions"
            toLabel={t("dash.see_all")}
            empty={mySessions.length === 0}
            emptyIcon={Inbox}
            emptyHint={t("dash.blank_journal")}
          >
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

          <Panel
            title={t("dash.day_agenda")}
            to="/schedule"
            toLabel={t("dash.see_all")}
            empty={todays.length === 0}
            emptyIcon={CalendarDays}
            emptyHint={t("dash.blank_today")}
          >
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
      </div>

    </>
  );
}

/* ------------------------------------------------------------------ Student Dashboard (Image 2) */

/**
 * Accueil de l'eleve.
 *
 * C'est la page de decouverte : les enseignants, les groupes ouverts, et le
 * bouton qui reserve une place. Le meme ecran sert aux comptes encore en
 * attente de validation (mode="guest"), pour qu'ils puissent consulter les
 * matieres et les enseignants sans attendre l'accord de l'administration.
 *
 * Les chiffres personnels de l'eleve — presences, cycles de paiement, dette —
 * n'ont pas disparu : ils vivent sur /attendance et /payments, ou ils sont
 * detailles, plutot que resumes en quatre tuiles ici.
 */
function StudentHome() {
  return <DiscoverPage mode="student" />;
}

/* ------------------------------------------------------------------ Admin Dashboard */

function AdminHome() {
  const { t, i18n } = useTranslation();
  const {
    students, teachers, classes, subjects, enrollments, sessions, payments,
    registrationRequests, notifications,
  } = useData();

  const today = new Date();
  const todayEnum = dayEnum(today);
  const tomorrowEnum = dayEnum(new Date(today.getTime() + 86_400_000));
  const month = billingMonth(today);
  // "septembre" rather than "2026-09" — the card is read at a glance.
  const monthName = new Intl.DateTimeFormat(i18n.language, { month: "long" }).format(today);
  const sameDay = (ms: number, d: Date) =>
    new Date(ms).toDateString() === d.toDateString();

  /** Debt per student, from the 4-session cycles. */
  const debts = useMemo(
    () =>
      students
        .map((s) => {
          const mine = enrollments.filter((e) => e.studentId === s.id);
          const due = mine.reduce((sum, e) => {
            const rows = payments.filter((p) => p.enrollmentId === e.id);
            const cls = classes.find((c) => c.id === e.classId);
            const bal = cycleBalance(
              sessions.filter((x) => x.classId === e.classId),
              s.id,
              cls?.pricePerSession ?? 0,
              rows
            );
            return sum + bal.totalDue;
          }, 0);
          return { student: s, due };
        })
        .sort((a, b) => b.due - a.due),
    [students, enrollments, payments, classes, sessions]
  );

  const totalDebt = debts.reduce((sum, d) => sum + d.due, 0);
  const owingCount = debts.filter((d) => d.due > 0).length;
  const clearPct = students.length
    ? Math.round(((students.length - owingCount) / students.length) * 100)
    : 100;

  /** Cash actually taken this month. */
  const collected = useMemo(
    () =>
      payments
        .filter((p) => p.status === "paid" && p.month === month)
        .reduce((sum, p) => sum + p.amount, 0),
    [payments, month]
  );

  /** Groups meeting today, with the marks already recorded for them. */
  const todaySessions = useMemo(
    () =>
      classes
        .filter((c) => c.dayOfWeek === todayEnum)
        .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
        .map((c) => {
          const sess = sessions.find((s) => s.classId === c.id && sameDay(s.date, today));
          const marks = sess ? Object.values(sess.attendance) : [];
          return {
            klass: c,
            done: !!sess,
            present: marks.filter((m) => m === "present").length,
            absent: marks.filter((m) => m !== "present").length,
            enrolled: enrollments.filter((e) => e.classId === c.id).length,
          };
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [classes, sessions, enrollments, todayEnum]
  );

  const tomorrowClasses = useMemo(
    () =>
      classes
        .filter((c) => c.dayOfWeek === tomorrowEnum)
        .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot)),
    [classes, tomorrowEnum]
  );

  const pending = registrationRequests.filter((r) => r.status === "pending");

  /** Six derniers mois : effectif cumule et encaissements. Sert aux deux
   *  mini-graphiques des cartes, qui montrent donc de vrais chiffres. */
  const trend = useMemo(() => {
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push(billingMonth(d));
    }
    const roll = months.map((m) => {
      const end = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0, 23, 59, 59).getTime();
      return students.filter((st) => st.createdAt <= end).length;
    });
    const cash = months.map((m) =>
      payments.filter((p) => p.status === "paid" && p.month === m).reduce((a, p) => a + p.amount, 0)
    );
    return { roll, cash };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, payments]);


  const QUICK: { to: string; icon: LucideIcon; label: string; tone: string }[] = [
    { to: "/students", icon: GraduationCap, label: t("dash.qa_student"), tone: "navy" },
    { to: "/teachers", icon: Users, label: t("dash.qa_teacher"), tone: "green" },
    { to: "/schedule", icon: CalendarDays, label: t("dash.qa_group"), tone: "gold" },
    { to: "/subjects", icon: BookOpen, label: t("dash.qa_subject"), tone: "teal" },
    { to: "/schedule", icon: ClipboardList, label: t("nav.schedule"), tone: "sky" },
    { to: "/attendance", icon: CheckCircle2, label: t("dash.qa_attendance"), tone: "green" },
  ];

  return (
    <>
      {/* ---------------------------------------------------- KPI row */}
      <div className="dash-kpis">
        <NavLink to="/students" className="dash-kpi navy">
          <span className="dash-kpi-icon"><GraduationCap size={20} /></span>
          <div>
            <span className="dash-kpi-label">{t("dash.kpi_students")}</span>
            <strong>{students.length}</strong>
            <em>{t("dash.kpi_students_sub")}</em>
          </div>
          <Spark values={trend.roll} />
        </NavLink>
        <NavLink to="/teachers" className="dash-kpi green">
          <span className="dash-kpi-icon"><Users size={20} /></span>
          <div>
            <span className="dash-kpi-label">{t("nav.teachers")}</span>
            <strong>{teachers.length}</strong>
            <em>{t("dash.kpi_teachers_sub")}</em>
          </div>
        </NavLink>
        <NavLink to="/sessions" className="dash-kpi sky">
          <span className="dash-kpi-icon"><Users size={20} /></span>
          <div>
            <span className="dash-kpi-label">{t("dash.kpi_groups")}</span>
            <strong>{classes.length}</strong>
            <em>{t("dash.kpi_groups_sub")}</em>
          </div>
        </NavLink>
        <NavLink to="/attendance" className="dash-kpi gold">
          <span className="dash-kpi-icon"><CalendarDays size={20} /></span>
          <div>
            <span className="dash-kpi-label">{t("dash.kpi_today")}</span>
            <strong>{todaySessions.length}</strong>
            <em>{t("dash.kpi_today_sub")}</em>
          </div>
        </NavLink>
        <NavLink to="/payments" className="dash-kpi teal">
          <span className="dash-kpi-icon"><Wallet size={20} /></span>
          <div>
            <span className="dash-kpi-label">{t("dash.kpi_cash", { month: monthName })}</span>
            <strong>{formatDA(collected)}</strong>
            <em>{t("dash.kpi_cash_sub")}</em>
          </div>
          <Bars values={trend.cash} />
        </NavLink>
      </div>

      {/* ---------------------------------------------------- three columns */}
      <div className="dash-grid3">
        {/* left: reminders + tomorrow */}
        <div className="dash-col">
          <Panel title={t("dash.reminders")} to="/notifications" toLabel={t("dash.see_all")}>
            <div className="dash-activities-list">
              {pending.length > 0 && (
                <NavLink to="/requests" className="dash-activity-item">
                  <span className="dash-activity-icon tone-gold"><Users size={18} /></span>
                  <div className="dash-activity-content">
                    <strong>{t("dash.rem_new_reg")}</strong>
                    <p>{t("dash.rem_new_reg_body", { n: pending.length })}</p>
                  </div>
                  <ArrowRight size={15} />
                </NavLink>
              )}
              {owingCount > 0 && (
                <NavLink to="/payments" className="dash-activity-item">
                  <span className="dash-activity-icon tone-danger"><Award size={18} /></span>
                  <div className="dash-activity-content">
                    <strong>{t("dash.rem_due")}</strong>
                    <p>{t("dash.rem_due_body", { n: owingCount })}</p>
                  </div>
                  <ArrowRight size={15} />
                </NavLink>
              )}
              {tomorrowClasses.length > 0 && (
                <NavLink to="/schedule" className="dash-activity-item">
                  <span className="dash-activity-icon tone-navy"><CalendarDays size={18} /></span>
                  <div className="dash-activity-content">
                    <strong>{t("dash.rem_tomorrow")}</strong>
                    <p>{t("dash.rem_tomorrow_body", { n: tomorrowClasses.length })}</p>
                  </div>
                  <span className="dash-due-badge">{tomorrowClasses[0].timeSlot.split("-")[0]}</span>
                </NavLink>
              )}
              {notifications.slice(0, 2).map((n) => (
                <div className="dash-activity-item" key={n.id}>
                  <span className="dash-activity-icon tone-green"><CheckCircle2 size={18} /></span>
                  <div className="dash-activity-content">
                    <strong>{n.message}</strong>
                    <p>{formatDate(n.createdAt)}</p>
                  </div>
                </div>
              ))}
              {pending.length === 0 && owingCount === 0 && notifications.length === 0 && (
                <p className="muted small">{t("dash.rem_none")}</p>
              )}
            </div>
            <BellArt />
          </Panel>


        </div>

        {/* middle: today's sessions as a timeline */}
        <div className="dash-col">
          <Panel title={t("dash.today_sessions")} to="/sessions" toLabel={t("dash.see_all")}>
            {todaySessions.length === 0 ? (
              <div className="dash-today-empty">
                <TodayArt />
                <p className="muted small">{t("dash.no_class_today")}</p>
              </div>
            ) : (
              <ol className="dash-timeline">
                {todaySessions.map((s) => (
                  <li key={s.klass.id}>
                    <span className="dash-time">{s.klass.timeSlot}</span>
                    <NavLink to={`/attendance-history?class=${s.klass.id}`} className="dash-session-card">
                      <div className="dash-session-id">
                        <strong>{subjects.find((x) => x.id === s.klass.subjectId)?.name ?? "—"}</strong>
                        <span className="muted small">
                          {LEVEL_LABEL[s.klass.level]} · {t("dash.n_enrolled", { n: s.enrolled })}
                        </span>
                      </div>
                      {s.done ? (
                        <>
                          <span className="dash-count ok"><b>{s.present}</b>{t("attendance.present")}</span>
                          <span className="dash-count no"><b>{s.absent}</b>{t("hist.pay_unpaid")}</span>
                        </>
                      ) : (
                        <span className="dash-count pending">{t("dash.not_marked")}</span>
                      )}
                      <ArrowRight size={15} />
                    </NavLink>
                  </li>
                ))}
              </ol>
            )}
            <NavLink to="/attendance" className="btn btn-primary dash-new-session">
              <CheckCircle2 size={16} /> {t("dash.qa_attendance")}
            </NavLink>
          </Panel>
        </div>

        {/* right: quick actions, finance, top debts */}
        <div className="dash-col">
          <Panel title={t("dash.quick_actions")}>
            <div className="dash-quick">
              {QUICK.map((q, i) => (
                <NavLink key={i} to={q.to} className={"dash-quick-btn tone-" + q.tone}>
                  <span className="dash-quick-icon"><q.icon size={17} /></span>
                  <span>{q.label}</span>
                </NavLink>
              ))}
            </div>
          </Panel>

        </div>
      </div>

      {/* -------------------------------------------- bandeau financier */}
      <section className="dash-fin-band">
        <WalletArt />
        <div className="dash-fin-body">
          <header className="dash-fin-head">
            <h2>{t("dash.finance")}</h2>
            <NavLink to="/payments" className="dash-panel-link">
              <span>{t("dash.see_report")}</span> <ArrowRight size={14} />
            </NavLink>
          </header>

          <div className="dash-fin-cols">
            <div className="dash-fin-figs">
              <div className="dash-fin-line">
                <span>{t("dash.kpi_cash", { month: monthName })}</span>
                <strong className="text-ok">{formatDA(collected)}</strong>
              </div>
              <div className="dash-fin-line">
                <span>{t("dash.total_debt")}</span>
                <strong className={totalDebt > 0 ? "text-danger" : "text-ok"}>{formatDA(totalDebt)}</strong>
              </div>
            </div>

            <div className="dash-fin-bars">
              <div className="dash-fin-bar">
                <span>{t("dash.students_clear")}</span>
                <span className="dash-bar-track"><span className="dash-bar ok" style={{ width: `${clearPct}%` }} /></span>
                <b>{clearPct}%</b>
              </div>
              <div className="dash-fin-bar">
                <span>{t("dash.students_owing")}</span>
                <span className="dash-bar-track"><span className="dash-bar no" style={{ width: `${100 - clearPct}%` }} /></span>
                <b>{100 - clearPct}%</b>
              </div>
            </div>

            <Donut pct={clearPct} label={t("dash.students_clear_short")} />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- weekly trend */}
    </>
  );
}

/* ------------------------------------------------------------- graphiques
   Traces a la main : la page n'embarque pas de librairie de graphes pour deux
   vignettes de 60 px, et ces series sont deja calculees plus haut. */

/** Courbe de tendance de la carte « eleves inscrits ». */
function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 26 - ((v - min) / span) * 22;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg className="dash-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts.join(" ")} fill="none" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Histogramme des encaissements des six derniers mois. */
function Bars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <span className="dash-bars" aria-hidden="true">
      {values.map((v, i) => (
        <i key={i} style={{ height: `${Math.max(12, (v / max) * 100)}%` }} />
      ))}
    </span>
  );
}

/** Anneau de progression du bandeau financier. */
function Donut({ pct, label }: { pct: number; label: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="dash-donut">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="9" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={pct >= 100 ? "var(--success)" : "var(--gold)"}
          strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${(c * pct) / 100} ${c}`}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="dash-donut-text">
        <strong>{pct}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- illustrations
   En SVG plutot qu'en emoji ou en image : rendu identique partout, et elles
   suivent la palette navy + or + ciel de la page vitrine. */

/** Cloche en filigrane, au pied du panneau des rappels. */
function BellArt() {
  return (
    <svg className="dash-bell-art" viewBox="0 0 120 90" fill="none" aria-hidden="true">
      <path
        d="M60 16a22 22 0 0122 22v15l7 11a2.5 2.5 0 01-2 4H55a2.5 2.5 0 01-2-4l7-11V38a22 22 0 011-22z"
        fill="currentColor" opacity="0.5"
      />
      <path d="M60 8v8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M51 72a10 10 0 0018 0" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M96 30l7-4M99 44l8 1M24 30l-7-4M21 44l-8 1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Presse-papiers et horloge, quand la journee n'a aucune seance. */
function TodayArt() {
  return (
    <svg className="dash-today-art" viewBox="0 0 120 96" fill="none" aria-hidden="true">
      <rect x="26" y="14" width="52" height="64" rx="8" fill="var(--navy-700)" />
      <rect x="32" y="20" width="40" height="52" rx="5" fill="#fff" opacity="0.95" />
      <rect x="40" y="8" width="24" height="12" rx="5" fill="var(--gold-400)" />
      <g stroke="var(--navy-500)" strokeWidth="3" strokeLinecap="round" opacity="0.45">
        <path d="M40 34h14M40 44h22M40 54h12" />
      </g>
      <circle cx="86" cy="62" r="20" fill="var(--sky-300)" />
      <circle cx="86" cy="62" r="15" fill="#fff" />
      <path d="M86 53v9l6 4" stroke="var(--navy-700)" strokeWidth="3" strokeLinecap="round" />
      <path d="M14 46c6-10 6-20 0-30" stroke="var(--sky-500)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="104" cy="22" r="3.5" fill="var(--gold-300)" />
    </svg>
  );
}

/** Portefeuille et pieces, a gauche du bandeau financier. */
function WalletArt() {
  return (
    <svg className="dash-wallet-art" viewBox="0 0 110 90" fill="none" aria-hidden="true">
      <circle cx="22" cy="66" r="13" fill="var(--gold-400)" />
      <circle cx="22" cy="66" r="8" fill="var(--gold-300)" />
      <circle cx="42" cy="74" r="10" fill="var(--gold-500)" />
      <circle cx="42" cy="74" r="6" fill="var(--gold-300)" />

      <rect x="30" y="26" width="66" height="44" rx="10" fill="var(--navy-700)" />
      <path d="M30 40h66v12H74a6 6 0 010-12z" fill="var(--navy-800)" />
      <circle cx="78" cy="46" r="4" fill="var(--gold-400)" />
      <path d="M38 26l38-12a5 5 0 016 4l2 8" fill="var(--navy-600)" />

      <g stroke="var(--sky-500)" strokeWidth="4" strokeLinecap="round">
        <path d="M86 24V12M96 24V6M76 24v-6" />
      </g>
    </svg>
  );
}

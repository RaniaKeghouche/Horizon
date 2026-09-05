import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Users, ClipboardList, Wallet, CalendarDays, GraduationCap, UserRound,
  ChevronLeft, ChevronRight, ChevronDown, CircleCheck, Clock, LayoutGrid, List,
  CalendarPlus,
} from "lucide-react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { billingMonth, formatDA } from "../../lib/format";
import { LEVEL_LABEL } from "../../lib/labels";
import "./sessions.css";
import type { DayOfWeek, Session } from "../../lib/types";

/** Pastilles du bandeau : même gamme bleue que le reste de l'app. */
const TILES = [
  { bg: "#e7edf8", fg: "#2d5490" },
  { bg: "#e3f0fb", fg: "#1f6fa8" },
  { bg: "#e2f4f6", fg: "#17798a" },
  { bg: "#e6f1fd", fg: "#3667b5" },
  { bg: "#e9ecfa", fg: "#4257a8" },
];
const tile = (i: number) => ({ "--tile-bg": TILES[i].bg, "--tile-fg": TILES[i].fg } as React.CSSProperties);

/** Position du jour de cours dans la semaine JS (dimanche = 0). */
const DAY_INDEX: Record<DayOfWeek, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

/** Une ligne du calendrier : séance tenue, ou occurrence encore à venir. */
type Row =
  | { kind: "held"; date: number; n: number; session: Session }
  | { kind: "soon"; date: number; n: number };

// Overview: every group → its sessions grouped by month → each student's attendance
// and paid/unpaid status for that exact session. Admin sees all groups; a teacher sees
// only their own groups (cahier: prof consulte ses groupes, élèves, présences, paiement).
export default function SessionsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { role, profile } = useAuth();
  const { classes, subjects, teachers, students, enrollments, sessions, payments } = useData();

  const myClasses = useMemo(
    () => (role === "teacher" && profile?.teacherId ? classes.filter((c) => c.teacherId === profile.teacherId) : classes),
    [classes, role, profile]
  );
  const [classId, setClassId] = useState(myClasses[0]?.id ?? "");
  // In Supabase mode the store is still empty on the first render, so a classId
  // initialised from myClasses[0] stays "" forever and the page looks empty even
  // though groups exist. Adopt the first group as soon as the data arrives, and
  // re-adopt if the selected group disappears.
  useEffect(() => {
    if (myClasses.length === 0) return;
    if (myClasses.some((c) => c.id === classId)) return;
    setClassId(myClasses[0].id);
  }, [myClasses, classId]);

  const [view, setView] = useState<"month" | "list">("month");
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "?";
  const teacherName = (id: string) => teachers.find((x) => x.id === id)?.name ?? "?";

  const klass = classes.find((c) => c.id === classId);
  const mySessions = useMemo(
    () => sessions.filter((s) => s.classId === classId).sort((a, b) => a.date - b.date),
    [sessions, classId]
  );

  // Le mois affiché suit le groupe : on ouvre sur sa dernière séance connue,
  // pas sur le mois courant, qui est souvent vide.
  useEffect(() => {
    const last = mySessions[mySessions.length - 1];
    setCursor(startOfMonth(last ? new Date(last.date) : new Date()));
  }, [classId]); // eslint-disable-line react-hooks/exhaustive-deps

  const roster = useMemo(
    () =>
      enrollments
        .filter((e) => e.classId === classId)
        .map((e) => ({ enr: e, student: students.find((s) => s.id === e.studentId) }))
        .filter((r): r is { enr: typeof r.enr; student: NonNullable<typeof r.student> } => !!r.student),
    [enrollments, students, classId]
  );

  const totalUnpaid = useMemo(
    () =>
      payments
        .filter((p) => p.status === "unpaid" && mySessions.some((s) => s.id === p.sessionId))
        .reduce((sum, p) => sum + p.amount, 0),
    [payments, mySessions]
  );

  /** Séances du mois affiché, complétées par les créneaux encore à venir. */
  const monthRows = useMemo<Row[]>(() => {
    if (!klass) return [];
    const rows: Row[] = mySessions
      .filter((s) => sameMonth(new Date(s.date), cursor))
      .map((s, i) => ({ kind: "held", date: s.date, n: s.sessionNumber ?? i + 1, session: s }));

    // Les occurrences futures du créneau hebdomadaire n'existent pas en base :
    // on les projette pour que le mois se lise en entier.
    let n = mySessions.filter((s) => s.date <= endOfMonth(cursor).getTime()).length;
    for (const d of weekdaysOfMonth(cursor, DAY_INDEX[klass.dayOfWeek])) {
      const ts = d.getTime();
      if (ts < Date.now()) continue;
      if (rows.some((r) => sameDay(new Date(r.date), d))) continue;
      rows.push({ kind: "soon", date: ts, n: ++n });
    }
    return rows.sort((a, b) => a.date - b.date);
  }, [klass, mySessions, cursor]);

  /** Vue liste : toutes les séances tenues, du plus récent au plus ancien. */
  const listRows = useMemo<Row[]>(
    () =>
      [...mySessions]
        .reverse()
        .map((s, i) => ({ kind: "held", date: s.date, n: s.sessionNumber ?? mySessions.length - i, session: s })),
    [mySessions]
  );

  const rows = view === "month" ? monthRows : listRows;

  function open(row: Row) {
    if (row.kind === "held") navigate(`/attendance-history?class=${classId}`);
    else navigate(`/attendance?class=${classId}`);
  }

  return (
    <div className="stack">
      <header className="grp-head">
        <span className="grp-head-icon" aria-hidden="true"><Users size={26} /></span>
        <div className="grp-head-title">
          <h1>{role === "teacher" ? t("dash.my_groups") : t("grp.title_admin")}</h1>
          {klass && (
            <p>{t("grp.summary", { students: roster.length, sessions: mySessions.length })}</p>
          )}
        </div>
        {myClasses.length > 0 && (
          <div className="grp-picker-shell">
            <CalendarDays size={18} aria-hidden="true" />
            <select value={classId} onChange={(e) => setClassId(e.target.value)}>
              {myClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {subjName(c.subjectId)} · {t(`days.${c.dayOfWeek}`)} {c.timeSlot} · {teacherName(c.teacherId)}
                </option>
              ))}
            </select>
            <ChevronDown className="grp-chevron" size={16} aria-hidden="true" />
          </div>
        )}
      </header>

      {myClasses.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon"><CalendarDays size={24} /></span>
            <strong>{t("grp.none")}</strong>
            <p>{t("grp.none_hint")}</p>
          </div>
        </div>
      )}

      {klass && (
        <>
          <div className="grp-kpis">
            <div className="card grp-kpi" style={tile(0)}>
              <span className="grp-kpi-icon"><Users size={19} /></span>
              <div className="grp-kpi-body">
                <span className="grp-kpi-value">{roster.length} / {klass.maxStudents}</span>
                <span className="grp-kpi-label">{t("grp.enrolled")}</span>
                <span className="grp-bar">
                  <i style={{ width: `${Math.min(100, (roster.length / Math.max(1, klass.maxStudents)) * 100)}%` }} />
                </span>
                <span className="grp-kpi-foot">
                  {t("grp.places_left", { n: Math.max(0, klass.maxStudents - roster.length) })}
                </span>
              </div>
            </div>

            <div className="card grp-kpi" style={tile(1)}>
              <span className="grp-kpi-icon"><ClipboardList size={19} /></span>
              <div className="grp-kpi-body">
                <span className="grp-kpi-value">
                  {mySessions.filter((s) => sameMonth(new Date(s.date), cursor)).length}
                </span>
                <span className="grp-kpi-label">{t("dash.sessions_held")}</span>
                <span className="grp-kpi-foot">{monthLabel(i18n.language, cursor)}</span>
              </div>
            </div>

            <div className="card grp-kpi" style={tile(2)}>
              <span className="grp-kpi-icon"><Wallet size={19} /></span>
              <div className="grp-kpi-body">
                <span className={"grp-kpi-value sm " + (totalUnpaid > 0 ? "text-danger" : "text-ok")}>
                  {totalUnpaid > 0 ? formatDA(totalUnpaid) : t("grp.all_paid")}
                </span>
                <span className="grp-kpi-label">{t("grp.group_status")}</span>
              </div>
            </div>

            <div className="card grp-kpi" style={tile(3)}>
              <span className="grp-kpi-icon"><GraduationCap size={19} /></span>
              <div className="grp-kpi-body">
                <span className="grp-kpi-value">{LEVEL_LABEL[klass.level]}</span>
                <span className="grp-kpi-label">{t("grp.group_level")}</span>
              </div>
            </div>

            <div className="card grp-kpi" style={tile(4)}>
              <span className="grp-kpi-icon"><UserRound size={19} /></span>
              <div className="grp-kpi-body">
                <span className="grp-kpi-value sm">{teacherName(klass.teacherId)}</span>
                <span className="grp-kpi-label">{t("grp.teacher_label")}</span>
              </div>
            </div>
          </div>

          <div className="grp-board">
            {/* --------------------------------------------- élèves du groupe */}
            <div className="grp-col">
              <div className="card">
                <div className="grp-card-head">
                  <Users size={17} aria-hidden="true" />
                  <h2>{t("grp.roster", { n: roster.length })}</h2>
                  <button className="grp-seeall" onClick={() => navigate("/students")}>
                    {t("grp.see_all")}
                  </button>
                </div>

                {roster.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-state-icon"><Users size={24} /></span>
                    <strong>{t("att.no_roster")}</strong>
                    <p>{t("att.no_roster_hint")}</p>
                  </div>
                ) : (
                  <div className="grp-roster">
                    <div className="grp-roster-head">
                      <span>{t("nav.students")}</span>
                      <span>{t("stu.level")}</span>
                    </div>
                    {roster.map(({ enr, student }) => {
                      const due = payments
                        .filter((p) => p.enrollmentId === enr.id && p.status === "unpaid")
                        .reduce((a, p) => a + p.amount, 0);
                      return (
                        <div key={student.id} className="grp-roster-row">
                          <span className="grp-student">
                            <span className="grp-avatar" aria-hidden="true">{initials(student.name)}</span>
                            <span className="grp-student-name">
                              <strong>{student.name}</strong>
                              {due > 0 && (
                                <span className="grp-student-due">{formatDA(due)}</span>
                              )}
                            </span>
                          </span>
                          <span className="grp-level">{LEVEL_LABEL[student.level]}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <aside className="grp-promo">
                <div>
                  <h3>{t("grp.promo_title")}</h3>
                  <p>{t("grp.promo_text")}</p>
                </div>
                <PromoArt />
              </aside>
            </div>

            {/* ------------------------------------------ calendrier séances */}
            <div className="card">
              <div className="grp-card-head">
                <CalendarDays size={17} aria-hidden="true" />
                <h2>{t("grp.calendar")}</h2>
                <div className="grp-viewtabs">
                  <button
                    className={"grp-viewtab" + (view === "month" ? " on" : "")}
                    onClick={() => setView("month")}
                  >
                    <LayoutGrid size={13} /> {t("grp.view_month")}
                  </button>
                  <button
                    className={"grp-viewtab" + (view === "list" ? " on" : "")}
                    onClick={() => setView("list")}
                  >
                    <List size={13} /> {t("grp.view_list")}
                  </button>
                </div>
              </div>

              {view === "month" && (
                <div className="grp-monthbar">
                  <button
                    className="grp-monthbtn"
                    onClick={() => setCursor(addMonths(cursor, -1))}
                    aria-label={t("grp.prev_month")}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <strong>{monthLabel(i18n.language, cursor)}</strong>
                  <button
                    className="grp-monthbtn"
                    onClick={() => setCursor(addMonths(cursor, 1))}
                    aria-label={t("grp.next_month")}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {rows.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state-icon"><ClipboardList size={24} /></span>
                  <strong>{t("att.no_session")}</strong>
                  <p>{view === "month" ? t("grp.no_month_session") : t("att.no_session_hint")}</p>
                </div>
              ) : (
                <div className="grp-sessions">
                  {rows.map((row, i) => {
                    const d = new Date(row.date);
                    // En vue liste, les mois se suivent : on les sépare d'une étiquette.
                    const tag =
                      view === "list" &&
                      (i === 0 || billingMonth(new Date(rows[i - 1].date)) !== billingMonth(d))
                        ? monthLabel(i18n.language, d)
                        : null;
                    return (
                      // Plusieurs seances supplementaires peuvent tomber le meme
                      // jour : la date seule ne fait plus une cle unique.
                      <div key={row.kind === "held" ? row.session.id : `soon-${row.date}`}>
                        {tag && <span className="grp-monthtag">{tag}</span>}
                        <button className="grp-session" onClick={() => open(row)}>
                          <span className="grp-date">
                            <em>{fmt(i18n.language, d, { weekday: "short" })}</em>
                            <b>{String(d.getDate()).padStart(2, "0")}</b>
                            <em>{fmt(i18n.language, d, { month: "short" })}</em>
                          </span>
                          <span className={"grp-state " + row.kind}>
                            {row.kind === "held" ? <CircleCheck size={19} /> : <Clock size={19} />}
                          </span>
                          <span className="grp-session-body">
                            <strong>
                              {t("att.session_n", { n: row.n })}
                              {row.kind === "held" && row.session.isExtra && (
                                <span className="att-extra-badge">
                                  <CalendarPlus size={12} aria-hidden="true" /> {t("att.extra_short")}
                                </span>
                              )}
                            </strong>
                            <span className="grp-session-time">
                              <Clock size={12} />{" "}
                              {row.kind === "held" && row.session.isExtra
                                ? t("att.extra_session")
                                : klass.timeSlot.replace("-", " - ")}
                            </span>
                          </span>
                          {row.kind === "held" ? (
                            <SessionBadge session={row.session} />
                          ) : (
                            <span className="grp-badge soon">{t("grp.upcoming")}</span>
                          )}
                          <ChevronRight className="grp-go" size={16} aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  /** Pastille d'une séance tenue : combien d'élèves étaient présents. */
  function SessionBadge({ session }: { session: Session }) {
    const marks = Object.values(session.attendance);
    const present = marks.filter((m) => m === "present").length;
    const unpaid = payments.filter((p) => p.sessionId === session.id && p.status === "unpaid").length;
    if (unpaid > 0) {
      return <span className="grp-badge due">{t("grp.n_unpaid", { n: unpaid })}</span>;
    }
    return <span className="grp-badge held">{t("grp.n_present", { n: present })}</span>;
  }
}

/* ------------------------------------------------------------------ dates */

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
function sameDay(a: Date, b: Date) { return sameMonth(a, b) && a.getDate() === b.getDate(); }

/** Toutes les dates du mois tombant sur ce jour de la semaine. */
function weekdaysOfMonth(month: Date, weekday: number): Date[] {
  const out: Date[] = [];
  const d = new Date(month.getFullYear(), month.getMonth(), 1);
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
  while (d.getMonth() === month.getMonth()) {
    out.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return out;
}

function fmt(lang: string, d: Date, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(lang, opts).format(d);
}
function monthLabel(lang: string, d: Date) {
  return fmt(lang, d, { month: "long", year: "numeric" });
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

/** Illustration de la carte « Organisation claire ». */
function PromoArt() {
  return (
    <svg className="grp-promo-art" viewBox="0 0 108 96" fill="none" aria-hidden="true">
      <rect x="12" y="14" width="72" height="66" rx="8" fill="#fff" opacity="0.9" />
      <rect x="12" y="14" width="72" height="15" rx="8" fill="var(--gold)" opacity="0.85" />
      <path d="M28 8v12M68 8v12" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <g fill="var(--navy-700)" opacity="0.35">
        <rect x="21" y="37" width="14" height="10" rx="3" />
        <rect x="40" y="37" width="14" height="10" rx="3" />
        <rect x="59" y="37" width="14" height="10" rx="3" />
        <rect x="21" y="52" width="14" height="10" rx="3" />
        <rect x="59" y="52" width="14" height="10" rx="3" />
      </g>
      <circle cx="47" cy="57" r="10" fill="var(--gold)" />
      <path d="M43 57l3 3 6-7" stroke="var(--navy-900)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="90" cy="70" r="13" fill="#fff" opacity="0.9" />
      <path d="M90 63v7l4 3" stroke="var(--navy-700)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

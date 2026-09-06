import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CircleCheck, CircleX, CircleAlert, Target, ClipboardList, CalendarDays,
  Download, LayoutGrid, List, ChevronDown, Trophy, ArrowRight, Info,
} from "lucide-react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { formatDate } from "../../lib/format";
import { LEVEL_LABEL } from "../../lib/labels";
import { subjectIcon, tintStyle } from "../../lib/subjectLook";
import { printAttendanceReport } from "../../lib/attendanceReport";
import type { AttendanceState, ClassRoom } from "../../lib/types";
import "./student-attendance.css";

/**
 * Les presences de l'eleve.
 *
 * Trois etats sont montres, tires des trois etats reels de l'appel :
 *   present     → Present ;
 *   absent_free → Justifiee — l'ecole ne facture pas la seance, c'est ce qui
 *                 distingue une absence excusee dans ce logiciel ;
 *   absent_paid → Absente — la seance est facturee malgre l'absence.
 * Le mot « justifie » n'existe pas en base : il se lit dans le fait que la
 * seance n'a pas ete facturee (voir isBillable dans lib/payments).
 *
 * Tous les chiffres viennent des cartes de presence reellement enregistrees.
 * Une seance ou l'eleve n'a pas ete pointe du tout n'est comptee nulle part.
 */

type View = "calendar" | "list";

const STATE_ICON: Record<AttendanceState, typeof CircleCheck> = {
  present: CircleCheck,
  absent_free: CircleAlert,
  absent_paid: CircleX,
};

/** Classe CSS et cle i18n partagees par la grille, les pastilles et la legende. */
const STATE_KEY: Record<AttendanceState, string> = {
  present: "present",
  absent_free: "excused",
  absent_paid: "absent",
};

export default function StudentAttendance() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const { students, sessions, classes, subjects, teachers, enrollments } = useData();

  const [view, setView] = useState<View>("calendar");
  const [classFilter, setClassFilter] = useState("all");
  /** Mois affiche, ancre au premier jour. */
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [day, setDay] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const student = students.find((s) => s.id === profile?.linkedStudentId);

  const subjName = (id?: string) => subjects.find((s) => s.id === id)?.name ?? "—";
  const teacherName = (id?: string) => teachers.find((x) => x.id === id)?.name ?? "—";

  /** Les groupes suivis, dans l'ordre ou ils apparaissent sur la grille. */
  const myClasses = useMemo<ClassRoom[]>(() => {
    if (!student) return [];
    const ids = new Set(enrollments.filter((e) => e.studentId === student.id).map((e) => e.classId));
    return classes.filter((c) => ids.has(c.id));
  }, [student, enrollments, classes]);

  /** Une ligne par carte de presence reellement enregistree pour cet eleve. */
  const marks = useMemo(() => {
    if (!student) return [];
    return sessions
      .filter((s) => s.attendance[student.id] !== undefined)
      .filter((s) => classFilter === "all" || s.classId === classFilter)
      .map((s) => {
        const klass = classes.find((c) => c.id === s.classId);
        return {
          id: s.id,
          date: s.date,
          classId: s.classId,
          subject: subjName(klass?.subjectId),
          teacher: teacherName(klass?.teacherId),
          slot: klass?.timeSlot ?? "—",
          state: s.attendance[student.id] as AttendanceState,
        };
      })
      .sort((a, b) => b.date - a.date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student, sessions, classes, subjects, teachers, classFilter]);

  const inMonth = useMemo(
    () =>
      marks.filter((m) => {
        const d = new Date(m.date);
        return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
      }),
    [marks, month]
  );

  const tally = (list: typeof marks) => ({
    present: list.filter((m) => m.state === "present").length,
    excused: list.filter((m) => m.state === "absent_free").length,
    absent: list.filter((m) => m.state === "absent_paid").length,
    total: list.length,
  });
  const all = tally(marks);
  const mth = tally(inMonth);
  const rate = all.total > 0 ? Math.round((all.present / all.total) * 100) : null;

  /** Un pourcentage par groupe : c'est la question que pose un bulletin. */
  const perClass = useMemo(
    () =>
      myClasses.map((c) => {
        const list = marks.filter((m) => m.classId === c.id);
        const p = list.filter((m) => m.state === "present").length;
        return {
          klass: c,
          total: list.length,
          rate: list.length > 0 ? Math.round((p / list.length) * 100) : null,
        };
      }),
    [myClasses, marks]
  );

  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const dayLetter = (n: number) =>
    new Intl.DateTimeFormat(i18n.language, { weekday: "narrow" })
      .format(new Date(month.getFullYear(), month.getMonth(), n))
      .toUpperCase();

  /** L'etat d'un groupe un jour donne, ou null si aucune seance pointee. */
  function stateAt(classId: string, n: number): AttendanceState | null {
    const hit = inMonth.find(
      (m) => m.classId === classId && new Date(m.date).getDate() === n
    );
    return hit ? hit.state : null;
  }

  const listed = day
    ? inMonth.filter((m) => new Date(m.date).getDate() === day)
    : showAll
    ? marks
    : marks.slice(0, 4);

  const monthLabel = new Intl.DateTimeFormat(i18n.language, {
    month: "long",
    year: "numeric",
  }).format(month);

  function shiftMonth(step: number) {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + step, 1));
    setDay(null);
  }

  function exportReport() {
    if (!student) return;
    printAttendanceReport({
      studentName: student.name,
      level: LEVEL_LABEL[student.level],
      period: monthLabel,
      lines: inMonth.map((m) => ({
        date: m.date,
        subject: m.subject,
        teacher: m.teacher,
        slot: m.slot,
        state: m.state,
      })),
      ...tally(inMonth),
      rate: mth.total > 0 ? Math.round((mth.present / mth.total) * 100) : null,
    }, t, i18n.language);
  }

  if (!student) return <p className="muted">{t("dash.no_student_link")}</p>;

  return (
    <div className="sat">
      <header className="sat-head">
        <div>
          <h1>{t("att.title_student")}</h1>
          <p>{t("sat.subtitle")}</p>
        </div>
        <button className="btn btn-ghost sat-export" onClick={exportReport} disabled={inMonth.length === 0}>
          <Download size={16} /> {t("sat.export")}
        </button>
      </header>

      <div className="sat-kpis">
        <Kpi tone="navy" icon={Target} value={rate === null ? "—" : `${rate}%`}
             label={t("dash.attendance_rate")} sub={rate === null ? t("sat.no_data") : gradeOf(rate, t)} />
        <Kpi tone="green" icon={CircleCheck} value={`${mth.present} / ${mth.total}`}
             label={t("sat.attended")} sub={t("sat.this_month")} />
        <Kpi tone="gold" icon={CircleX} value={String(mth.absent)}
             label={t("sat.missed")} sub={t("sat.this_month")} />
        <Kpi tone="sky" icon={CircleAlert} value={String(mth.excused)}
             label={t("sat.excused")} sub={t("sat.this_month")} />
      </div>

      <div className="sat-body">
        <div className="sat-main">
          <div className="sat-toolbar card">
            <label className="sat-select">
              <ClipboardList size={15} aria-hidden="true" />
              <select value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setDay(null); }}>
                <option value="all">{t("sat.all_groups")}</option>
                {myClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {subjName(c.subjectId)} — {t("days." + c.dayOfWeek)}
                  </option>
                ))}
              </select>
            </label>

            <div className="sat-month">
              <button onClick={() => shiftMonth(-1)} aria-label={t("sat.prev_month")}>‹</button>
              <span><CalendarDays size={14} /> {monthLabel}</span>
              <button onClick={() => shiftMonth(1)} aria-label={t("sat.next_month")}>›</button>
            </div>

            <div className="sat-views">
              <button className={view === "calendar" ? "on" : ""} onClick={() => setView("calendar")}>
                <LayoutGrid size={14} /> {t("sat.calendar")}
              </button>
              <button className={view === "list" ? "on" : ""} onClick={() => { setView("list"); setDay(null); }}>
                <List size={14} /> {t("sat.list")}
              </button>
            </div>
          </div>

          {view === "calendar" && (
            <section className="card sat-grid-card">
              <header className="sat-card-head">
                <h2>{t("sat.month_overview")}</h2>
                <span className="sat-hint"><Info size={13} /> {t("sat.click_day")}</span>
              </header>

              {myClasses.length === 0 ? (
                <p className="sat-empty">{t("att.no_history_hint")}</p>
              ) : (
                <div className="sat-grid-scroll">
                  <table className="sat-grid">
                    <thead>
                      <tr>
                        <th className="sat-grid-side" />
                        {Array.from({ length: days }, (_, i) => i + 1).map((n) => (
                          <th key={n} className={day === n ? "on" : ""}>
                            <em>{dayLetter(n)}</em>
                            <b>{n}</b>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {myClasses
                        .filter((c) => classFilter === "all" || c.id === classFilter)
                        .map((c) => {
                          const name = subjName(c.subjectId);
                          const Icon = subjectIcon(name);
                          return (
                            <tr key={c.id} style={tintStyle(name)}>
                              <th className="sat-grid-side">
                                <span className="sat-row-tile"><Icon size={15} /></span>
                                <span className="sat-row-id">
                                  <strong>{name}</strong>
                                  <em>{c.level.toUpperCase()} · {teacherName(c.teacherId)}</em>
                                </span>
                              </th>
                              {Array.from({ length: days }, (_, i) => i + 1).map((n) => {
                                const st = stateAt(c.id, n);
                                const Mark = st ? STATE_ICON[st] : null;
                                return (
                                  <td key={n}>
                                    <button
                                      type="button"
                                      className={"sat-cell " + (st ? STATE_KEY[st] : "none") + (day === n ? " picked" : "")}
                                      disabled={!st}
                                      onClick={() => setDay(day === n ? null : n)}
                                      title={
                                        st
                                          ? `${n} — ${t("sat.st_" + STATE_KEY[st])}`
                                          : `${n} — ${t("sat.st_none")}`
                                      }
                                    >
                                      {Mark ? <Mark size={13} /> : <i />}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}

              <footer className="sat-legend">
                <span><i className="present" />{t("sat.st_present")}</span>
                <span><i className="absent" />{t("sat.st_absent")}</span>
                <span><i className="excused" />{t("sat.st_excused")}</span>
                <span><i className="none" />{t("sat.st_none")}</span>
              </footer>
            </section>
          )}

          <section className="card sat-recent">
            <header className="sat-card-head">
              <h2>{day ? t("sat.day_sessions", { n: day }) : t("sat.recent")}</h2>
              {day && (
                <button className="sat-clear" onClick={() => setDay(null)}>{t("sat.whole_month")}</button>
              )}
            </header>

            {listed.length === 0 ? (
              <p className="sat-empty">{t("att.no_history")}</p>
            ) : (
              <div className="sat-rows">
                {listed.map((m) => {
                  const Icon = subjectIcon(m.subject);
                  const key = STATE_KEY[m.state];
                  return (
                    <article className="sat-row" key={m.id} style={tintStyle(m.subject)}>
                      <span className="sat-row-icon"><Icon size={18} /></span>
                      <div className="sat-row-main">
                        <strong>{m.subject}</strong>
                        <span>{t("disc.with")} {m.teacher}</span>
                      </div>
                      <div className="sat-row-when">
                        <CalendarDays size={13} />
                        <span>
                          {formatDate(m.date)}
                          <em>{m.slot}</em>
                        </span>
                      </div>
                      <span className={"sat-pill " + key}>{t("sat.st_" + key)}</span>
                    </article>
                  );
                })}
              </div>
            )}

            {!day && marks.length > 4 && (
              <button className="sat-more" onClick={() => setShowAll((v) => !v)}>
                <span>{showAll ? t("sat.show_less") : t("sat.show_all")}</span>
                <ChevronDown size={15} className={showAll ? "up" : ""} />
              </button>
            )}
          </section>
        </div>

        <aside className="sat-side">
          <section className="card sat-panel">
            <h3>{t("sat.summary")}</h3>
            <div className="sat-donut-wrap">
              <Donut present={all.present} excused={all.excused} absent={all.absent} rate={rate} t={t} />
              <ul className="sat-legend-list">
                <li><i className="present" />{t("sat.st_present")}<b>{all.present}</b><em>{pct(all.present, all.total)}</em></li>
                <li><i className="excused" />{t("sat.st_excused")}<b>{all.excused}</b><em>{pct(all.excused, all.total)}</em></li>
                <li><i className="absent" />{t("sat.st_absent")}<b>{all.absent}</b><em>{pct(all.absent, all.total)}</em></li>
              </ul>
            </div>
          </section>

          <section className="card sat-panel">
            <h3>{t("sat.my_groups")}</h3>
            {perClass.length === 0 ? (
              <p className="sat-empty">{t("att.no_history_hint")}</p>
            ) : (
              <ul className="sat-groups">
                {perClass.map(({ klass, rate: r, total }) => {
                  const name = subjName(klass.subjectId);
                  const Icon = subjectIcon(name);
                  return (
                    <li key={klass.id} style={tintStyle(name)}>
                      <span className="sat-group-tile"><Icon size={15} /></span>
                      <div>
                        <strong>{name} — {klass.level.toUpperCase()}</strong>
                        <span>{teacherName(klass.teacherId)}</span>
                      </div>
                      {/* Sans seance pointee, aucun taux n'a de sens : on le dit
                          au lieu d'afficher 0 %, qui se lirait comme un echec. */}
                      <b className={r === null ? "idle" : r >= 80 ? "ok" : r >= 60 ? "warn" : "no"}>
                        {r === null ? t("sat.no_data") : `${r}%`}
                        {total > 0 && <em>{t("sat.n_sessions", { n: total })}</em>}
                      </b>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="sat-motiv">
            <span className="sat-motiv-icon" aria-hidden="true"><Trophy size={22} /></span>
            <h3>{t("dash.motiv_student_title")}</h3>
            <p>{t("dash.motiv_student_body")}</p>
            <button className="sat-motiv-btn" onClick={() => setView("list")}>
              <span>{t("sat.see_all_sessions")}</span>
              <ArrowRight size={15} />
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function pct(n: number, total: number): string {
  return total > 0 ? `${Math.round((n / total) * 100)}%` : "—";
}

/** Un mot sur le taux, plutot qu'un chiffre nu. */
function gradeOf(rate: number, t: (k: string) => string): string {
  if (rate >= 90) return t("sat.grade_great");
  if (rate >= 75) return t("sat.grade_good");
  if (rate >= 60) return t("sat.grade_ok");
  return t("sat.grade_low");
}

function Kpi({
  icon: Icon, value, label, sub, tone,
}: {
  icon: typeof CircleCheck;
  value: string;
  label: string;
  sub: string;
  tone: "navy" | "green" | "gold" | "sky";
}) {
  return (
    <div className={"sat-kpi tone-" + tone}>
      <span className="sat-kpi-icon"><Icon size={18} /></span>
      <div>
        <b>{value}</b>
        <span>{label}</span>
        <em>{sub}</em>
      </div>
    </div>
  );
}

/** Anneau a trois segments : present, justifie, absent. */
function Donut({
  present, excused, absent, rate, t,
}: {
  present: number;
  excused: number;
  absent: number;
  rate: number | null;
  t: (k: string) => string;
}) {
  const total = present + excused + absent;
  const R = 42;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const seg = (n: number, cls: string) => {
    const len = total > 0 ? (n / total) * C : 0;
    const el = (
      <circle
        key={cls}
        cx="55"
        cy="55"
        r={R}
        className={"sat-arc " + cls}
        strokeDasharray={`${len} ${C - len}`}
        strokeDashoffset={-offset}
        transform="rotate(-90 55 55)"
      />
    );
    offset += len;
    return len > 0 ? el : null;
  };
  return (
    <svg className="sat-donut" viewBox="0 0 110 110" role="img" aria-label={t("sat.summary")}>
      <circle cx="55" cy="55" r={R} className="sat-arc-bg" />
      {seg(present, "present")}
      {seg(excused, "excused")}
      {seg(absent, "absent")}
      <text x="55" y="53" className="sat-donut-n">{rate === null ? "—" : `${rate}%`}</text>
      <text x="55" y="68" className="sat-donut-k">{t("sat.overall")}</text>
    </svg>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  CircleCheck, ClipboardList, Save, Pencil, TriangleAlert, StickyNote,
  Users, CalendarDays, History, X, Search, CalendarPlus, Repeat2, UsersRound,
} from "lucide-react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { formatDate, isoDate, parseIsoDate } from "../../lib/format";
import { classOnDay, lastOccurrence } from "../../lib/schedule";
import type { AttendanceState } from "../../lib/types";
import "./attendance.css";
import StackedTable from "../../components/StackedTable";
import StudentAttendance from "./StudentAttendance";


export default function AttendancePage() {
  const { role, profile } = useAuth();
  if (role === "student") return <StudentAttendance />;
  return <TeacherAttendance teacherId={role === "teacher" ? profile?.teacherId : undefined} />;
}

/* ------------------------------------------------- Enseignant / admin : l'appel */

function TeacherAttendance({ teacherId }: { teacherId?: string }) {
  const { t } = useTranslation();
  const { classes, subjects, teachers, students, enrollments, sessions } = useData();
  const saveAttendance = useData((s) => s.saveAttendance);

  const myClasses = teacherId ? classes.filter((c) => c.teacherId === teacherId) : classes;
  // Le groupe propose d'emblee est celui qui a cours AUJOURD'HUI, pas le
  // premier de la liste : ouvrir la page un samedi sur un groupe du lundi
  // faisait enregistrer la seance du lundi a la date du samedi.
  const todaysClass = (list: typeof myClasses) => classOnDay(list) ?? list[0];
  const [classId, setClassId] = useState(() => todaysClass(myClasses)?.id ?? "");
  // La date suit le groupe : la derniere fois qu'il a eu cours, aujourd'hui
  // compris. L'enseignant reste libre de la changer — c'est le seul cas ou
  // elle s'ecarte du calendrier du groupe.
  const [date, setDate] = useState(() => {
    const c = todaysClass(myClasses);
    return isoDate(c ? lastOccurrence(c.dayOfWeek) : new Date());
  });
  // In Supabase mode the store is still empty on the first render, so a classId
  // initialised at mount stays "" forever and the page looks empty even though
  // groups exist. Adopt the group as soon as the data arrives — and la date avec
  // lui, sinon elle resterait sur celle calculee quand la liste etait vide.
  useEffect(() => {
    if (myClasses.length === 0) return;
    if (myClasses.some((c) => c.id === classId)) return;
    const pick = todaysClass(myClasses);
    if (!pick) return;
    setClassId(pick.id);
    setDate(isoDate(lastOccurrence(pick.dayOfWeek)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myClasses, classId]);

  // Sidebar filter: with many groups, scanning a list is slower than typing.
  const [groupSearch, setGroupSearch] = useState("");
  const klass = classes.find((c) => c.id === classId);
  const visibleClasses = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return myClasses;
    return myClasses.filter((c) => subjName(c.subjectId).toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myClasses, groupSearch, subjects]);

  const [note, setNote] = useState("");
  const [marks, setMarks] = useState<Record<string, AttendanceState>>({});
  /**
   * Ce que devient un eleve sur lequel l'enseignant n'a PAS clique.
   *
   * L'appel se fait de deux facons selon le groupe : soit on pointe les
   * absents (les autres sont donc presents), soit on pointe les presents (les
   * autres sont donc absents). Le premier clic dit laquelle des deux est en
   * cours et le remplissage automatique s'aligne dessus ; la regle retenue
   * reste affichee et reste modifiable a la main.
   *
   * L'absence par defaut est « non facturee » : facturer une seance a
   * quelqu'un uniquement parce qu'on ne l'a pas coche serait un prelevement
   * decide par un defaut d'interface.
   */
  const [fill, setFill] = useState<AttendanceState>("present");
  const [fillLocked, setFillLocked] = useState(false);
  /** Seance supplementaire : elle s'ajoute a la seance du jour au lieu de la
   *  remplacer, donc elle echappe a la regle « une seance par groupe et par
   *  date » et cree toujours une nouvelle entree. */
  const [extra, setExtra] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  // Confirmation en ligne plutôt qu'un alert() : la boîte native bloque le fil
  // d'exécution et sort l'enseignant de sa page en plein appel.
  const [flash, setFlash] = useState("");

  const roster = useMemo(
    () =>
      enrollments
        .filter((e) => e.classId === classId)
        .map((e) => students.find((s) => s.id === e.studentId))
        .filter((s): s is NonNullable<typeof s> => !!s),
    [enrollments, students, classId]
  );

  const classSessions = useMemo(
    () => sessions.filter((s) => s.classId === classId).sort((a, b) => b.date - a.date),
    [sessions, classId]
  );

  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "—";
  const stateOf = (studentId: string) => marks[studentId] ?? fill;
  const nextNumber = editingId
    ? classSessions.find((s) => s.id === editingId)?.sessionNumber ?? "?"
    : classSessions.length + 1;

  function resetForm(nextClassId = classId) {
    const ros = enrollments.filter((e) => e.classId === nextClassId).map((e) => e.studentId);
    setSelected(new Set(ros));
    setMarks({});
    setNote("");
    setEditingId(null);
    setExtra(false);
    setFill("present");
    setFillLocked(false);
    const next = classes.find((c) => c.id === nextClassId);
    setDate(isoDate(next ? lastOccurrence(next.dayOfWeek) : new Date()));
  }

  useEffect(() => {
    if (!editingId) setSelected(new Set(roster.map((s) => s.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, roster.length]);

  // A session is created once and edited afterwards. The moment the chosen
  // group + date matches one already recorded, the form loads it and switches
  // to editing — so pressing save can only ever update it, never duplicate it.
  useEffect(() => {
    // Une seance supplementaire s'ajoute a celle du jour : la reprendre ici
    // ecraserait justement la seance ordinaire qu'elle vient completer.
    if (extra) return;
    const already = classSessions.find(
      (x) => !x.isExtra && isoDate(new Date(x.date)) === date
    );
    if (already) {
      // Already recorded: load it, so saving can only update it.
      if (already.id === editingId) return;
      setEditingId(already.id);
      setNote(already.notes ?? "");
      setMarks({ ...already.attendance });
      setSelected(new Set(Object.keys(already.attendance)));
      return;
    }
    // Moved to a free date. Leaving edit mode on would re-date the session we
    // were editing instead of opening a new one — which silently loses the old
    // séance. Start a fresh entry, keeping the date the user just picked.
    if (editingId) {
      setEditingId(null);
      setNote("");
      setMarks({});
      setSelected(new Set(roster.map((x) => x.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, date, classSessions, editingId, extra]);

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(""), 4000);
    return () => clearTimeout(id);
  }, [flash]);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function setMark(studentId: string, state: AttendanceState) {
    // Premier clic de la saisie : il dit ce que l'enseignant est en train de
    // pointer, et donc ce que deviennent les eleves qu'il ne touchera pas.
    if (!fillLocked && Object.keys(marks).length === 0) {
      setFill(state === "present" ? "absent_free" : "present");
    }
    setMarks((m) => ({ ...m, [studentId]: state }));
  }

  function loadSession(sessId: string) {
    const sess = classSessions.find((s) => s.id === sessId);
    if (!sess) return;
    setEditingId(sess.id);
    setExtra(!!sess.isExtra);
    setDate(isoDate(new Date(sess.date)));
    setNote(sess.notes ?? "");
    setMarks({ ...sess.attendance });
    setSelected(new Set(Object.keys(sess.attendance)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function save() {
    if (!klass || selected.size === 0) return;
    // Belt and braces: even if the effect above has not run yet, a session that
    // already exists for this group and date is updated, never duplicated.
    // Une correction vise la seance ouverte ; une seance supplementaire cree
    // toujours une nouvelle entree, meme si le groupe a deja cours ce jour-la.
    const target = editingId ?? (extra
      ? undefined
      : classSessions.find((x) => !x.isExtra && isoDate(new Date(x.date)) === date)?.id);

    const full: Record<string, AttendanceState> = {};
    for (const s of roster) if (selected.has(s.id)) full[s.id] = stateOf(s.id);
    saveAttendance(
      klass.id,
      klass.teacherId,
      parseIsoDate(date).getTime(),
      full,
      note.trim() || undefined,
      target ?? undefined,
      extra
    );
    setFlash(target ? t("att.saved_edit") : t("att.saved"));
    resetForm();
  }

  const presentCount = roster.filter((s) => selected.has(s.id) && stateOf(s.id) === "present").length;

  return (
    <div className="stack att">
      <header className="page-head att-head">
        <div className="page-title">
          <h1>{t("att.title_call")}</h1>
          <p>{t("att.pick_group")}</p>
        </div>
        <div className="att-head-actions">
          <input className="input att-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Link className="btn btn-ghost" to={`/attendance-history?class=${classId}`}>
            <History size={16} /> {t("att.show_full_history")}
          </Link>
          <button className="btn btn-primary" onClick={save} disabled={!klass || selected.size === 0}>
            <Save size={17} /> {t("att.save_session")}
          </button>
        </div>
      </header>

      {flash && (
        <p className="att-flash">
          <CircleCheck size={16} /> {flash}
        </p>
      )}

      <div className="att-workspace">
        {/* Groups on the left: search, then pick the one being marked. */}
        <aside className="card att-groups">
          <div className="att-search-box">
            <Search size={15} aria-hidden="true" />
            <input
              className="input"
              value={groupSearch}
              placeholder={t("att.search_groups")}
              onChange={(e) => setGroupSearch(e.target.value)}
            />
          </div>
          <span className="att-groups-label">{t("att.my_groups")}</span>
          {visibleClasses.length === 0 ? (
            <p className="muted small">{t("att.no_group_match")}</p>
          ) : (
            <ul className="att-group-list">
              {visibleClasses.map((c) => (
                <li key={c.id}>
                  <button
                    className={"att-group-btn" + (c.id === classId ? " on" : "")}
                    onClick={() => { setClassId(c.id); resetForm(c.id); }}
                  >
                    <strong>{subjName(c.subjectId)}</strong>
                    <span>
                      {t("att.n_students", {
                        n: enrollments.filter((e) => e.classId === c.id).length,
                      })}
                      {" · "}
                      {c.timeSlot.split("-")[0]}
                    </span>
                    <em>{t(`days.${c.dayOfWeek}`)}</em>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

      {klass && roster.length > 0 ? (
      <div className="att-split">
        <div className="card stack">
          <div className="att-card-head">
            <strong>{t("att.students_n", { n: roster.length })}</strong>
            <span className="muted small">{t("att.click_hint")}</span>
          </div>
          <div className="att-toolbar">
            <span className="pill pill-soft">
              {t("att.session_n", { n: nextNumber })}
              {editingId ? ` · ${t("att.editing")}` : ""}
            </span>
            <span className="muted small">
              <CalendarDays size={13} /> {t(`days.${klass.dayOfWeek}`)} {klass.timeSlot}
            </span>
            <span className="att-count">
              <Users size={14} /> {presentCount}/{selected.size}
            </span>
            <div className="row-actions">
              <button className="btn btn-ghost sm" onClick={() => setSelected(new Set(roster.map((s) => s.id)))}>
                {t("att.all")}
              </button>
              <button className="btn btn-ghost sm" onClick={() => setSelected(new Set())}>
                {t("att.none")}
              </button>
            </div>
          </div>

          {/* Deux regles qui changent le resultat enregistre : elles sont donc
              affichees en clair au-dessus de la liste, pas cachees dans un menu. */}
          <div className="att-rules">
            <button
              type="button"
              className={"att-rule" + (fill === "present" ? " ok" : " no")}
              onClick={() => {
                setFill(fill === "present" ? "absent_free" : "present");
                setFillLocked(true);
              }}
              title={t("att.fill_hint")}
            >
              <UsersRound size={15} aria-hidden="true" />
              <span>{t("att.fill_rest")}</span>
              <b>{fill === "present" ? t("att.fill_present") : t("att.fill_absent")}</b>
              <Repeat2 size={14} aria-hidden="true" />
            </button>

            <button
              type="button"
              className={"att-rule extra" + (extra ? " on" : "")}
              onClick={() => {
                const next = !extra;
                setExtra(next);
                // Passer en seance supplementaire ouvre une saisie neuve : sinon
                // la nouvelle seance repartirait des pointages de l'ancienne.
                if (next) {
                  setEditingId(null);
                  setMarks({});
                  setNote("");
                  setFill("present");
                  setFillLocked(false);
                }
              }}
              aria-pressed={extra}
            >
              <CalendarPlus size={15} aria-hidden="true" />
              <span>{t("att.extra_session")}</span>
            </button>

            {extra && <span className="att-rule-note">{t("att.extra_hint")}</span>}
          </div>

          {/* A session exists for this date, so this is a correction, not a new
              entry. Saying so prevents the "did I already do the appel?" doubt. */}
          {editingId && (
            <div className="att-warn att-warn-info">
              <TriangleAlert size={17} />
              <span>
                {t("att.editing_notice", {
                  n: classSessions.find((x) => x.id === editingId)?.sessionNumber ?? "?",
                  date: formatDate(new Date(date).getTime()),
                })}
              </span>
            </div>
          )}

          {/* On ne pointe qu'un cote de la liste : les eleves non touches prennent
              la valeur de la regle affichee juste au-dessus. */}
          <StackedTable className="att-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("att.col_name")}</th>
                  <th>{t("att.col_phone")}</th>
                  <th>{t("att.col_status")}</th>
                  <th>{t("att.col_absence_type")}</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s, i) => {
                  const on = selected.has(s.id);
                  const st = stateOf(s.id);
                  const absent = on && st !== "present";
                  return (
                    <tr key={s.id} className={on ? "" : "off"}>
                      <td className="muted">{i + 1}</td>
                      <td>
                        <label className="att-name">
                          <input type="checkbox" checked={on} onChange={() => toggleSelected(s.id)} />
                          <span className="att-initials" aria-hidden="true">{initials(s.name)}</span>
                          <strong>{s.name}</strong>
                        </label>
                      </td>
                      <td className="muted num">{s.phone || "—"}</td>
                      <td>
                        {/* Three states, one click each: present, absent, or not
                            part of this session at all. */}
                        <div className="att-seg" role="group" aria-label={s.name}>
                          <button
                            className={"att-seg-btn p" + (on && st === "present" ? " on" : "")}
                            title={t("attendance.present")}
                            onClick={() => { if (!on) toggleSelected(s.id); setMark(s.id, "present"); }}
                          >
                            P
                          </button>
                          <button
                            className={"att-seg-btn a" + (on && st !== "present" ? " on" : "")}
                            title={t("attendance.absent_free")}
                            onClick={() => {
                              if (!on) toggleSelected(s.id);
                              setMark(s.id, st === "present" ? "absent_free" : st);
                            }}
                          >
                            A
                          </button>
                          <button
                            className={"att-seg-btn x" + (!on ? " on" : "")}
                            title={t("att.not_applicable")}
                            onClick={() => { if (on) toggleSelected(s.id); }}
                          >
                            ×
                          </button>
                        </div>
                      </td>
                      <td>
                        {absent ? (
                          <select
                            className="input sm"
                            value={st}
                            onChange={(e) => setMark(s.id, e.target.value as AttendanceState)}
                          >
                            <option value="absent_free">{t("attendance_short.absent_free")}</option>
                            <option value="absent_paid">{t("attendance_short.absent_paid")}</option>
                          </select>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
          </StackedTable>

          <label className="field">
            <span><StickyNote size={13} /> {t("att.note_label")}</span>
            <textarea
              className="input"
              placeholder={t("att.note_placeholder")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          {/* Legend, as on the register — the same four marks, same colours. */}
          <div className="att-legend">
            <span className="att-legend-title">{t("att.legend")}</span>
            <span><b className="att-key ok">P</b> {t("attendance.present")}</span>
            <span><b className="att-key no">A</b> {t("attendance.absent_free")}</span>
            <span><b className="att-key warn">AP</b> {t("attendance.absent_paid")}</span>
            <span><b className="att-key na">—</b> {t("att.not_applicable")}</span>
          </div>

          {editingId && (
            <div className="row-actions">
              <button className="btn btn-ghost" onClick={() => resetForm()}>
                <X size={16} /> {t("att.cancel_edit")}
              </button>
            </div>
          )}
        </div>

        {/* Running totals while you mark, so the desk can reconcile before saving. */}
        <aside className="card att-aside">
          <h3 className="att-aside-title">{t("att.summary")}</h3>
          <div className="att-stat ok">
            <span>{t("att.sum_present")}</span><strong>{presentCount}</strong>
          </div>
          <div className="att-stat no">
            <span>{t("att.sum_absent_free")}</span>
            <strong>{[...selected].filter((id) => stateOf(id) === "absent_free").length}</strong>
          </div>
          <div className="att-stat warn">
            <span>{t("att.sum_absent_paid")}</span>
            <strong>{[...selected].filter((id) => stateOf(id) === "absent_paid").length}</strong>
          </div>
          <div className="att-stat">
            <span>{t("att.sum_total")}</span><strong>{roster.length}</strong>
          </div>
          <p className="att-note"><CircleCheck size={14} /> {t("att.only_unpaid_counted")}</p>
        </aside>
      </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon"><Users size={24} /></span>
            <strong>{t("att.no_roster")}</strong>
            <p>{t("att.no_roster_hint")}</p>
          </div>
        </div>
      )}

      </div>

      <h2 className="section-title" id="att-history">
        <History size={16} /> {t("att.history")}
      </h2>
      {classSessions.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon"><ClipboardList size={24} /></span>
            <strong>{t("att.no_session")}</strong>
            <p>{t("att.no_session_hint")}</p>
          </div>
        </div>
      ) : (
        <StackedTable wrapClassName="card">
            <thead>
              <tr>
                <th>{t("att.date")}</th>
                <th>{t("att.slot")}</th>
                <th>{t("att.sum_present")}</th>
                <th>{t("att.sum_absent_free")}</th>
                <th>{t("att.sum_absent_paid")}</th>
                <th>{t("att.sum_total")}</th>
                <th>{t("att.marked_by")}</th>
                <th>{t("att.note_label")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {classSessions.map((sess) => {
                const marks = Object.values(sess.attendance);
                const nb = (st: AttendanceState) => marks.filter((m) => m === st).length;
                return (
                  <tr key={sess.id}>
                    <td>
                      {formatDate(sess.date)}
                      {sess.isExtra && (
                        <span className="att-extra-badge">
                          <CalendarPlus size={12} aria-hidden="true" /> {t("att.extra_short")}
                        </span>
                      )}
                    </td>
                    {/* Une seance supplementaire ne tombe pas sur le creneau
                        hebdomadaire : afficher celui-ci serait faux. */}
                    <td className="muted">{sess.isExtra ? "—" : klass?.timeSlot ?? "—"}</td>
                    <td className="text-ok"><strong>{nb("present")}</strong></td>
                    <td className="text-danger"><strong>{nb("absent_free")}</strong></td>
                    <td className="text-warn"><strong>{nb("absent_paid")}</strong></td>
                    <td>{marks.length}</td>
                    <td className="muted">
                      {teachers.find((x) => x.id === sess.teacherId)?.name ?? "—"}
                    </td>
                    <td className="muted">
                      {sess.notes ? <><StickyNote size={13} /> {sess.notes}</> : "—"}
                    </td>
                    <td className="row-actions">
                      <button className="btn btn-ghost sm" onClick={() => loadSession(sess.id)}>
                        <Pencil size={14} /> {t("common.edit")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
        </StackedTable>
      )}
    </div>
  );
}

/* ------------------------------------------------- Élève / parent : lecture seule */


function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}


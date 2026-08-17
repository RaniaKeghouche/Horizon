import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CircleCheck, ClipboardList, Save, Pencil, TriangleAlert, StickyNote,
  Users, CalendarDays, History, X,
} from "lucide-react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { formatDate } from "../../lib/format";
import type { AttendanceState } from "../../lib/types";
import "./attendance.css";

const STATES: AttendanceState[] = ["present", "absent_paid", "absent_free"];

export default function AttendancePage() {
  const { role, profile } = useAuth();
  if (role === "student") return <StudentAttendance />;
  return <TeacherAttendance teacherId={role === "teacher" ? profile?.teacherId : undefined} />;
}

/* ------------------------------------------------- Enseignant / admin : l'appel */

function TeacherAttendance({ teacherId }: { teacherId?: string }) {
  const { t } = useTranslation();
  const { classes, subjects, students, enrollments, sessions } = useData();
  const saveAttendance = useData((s) => s.saveAttendance);

  const myClasses = teacherId ? classes.filter((c) => c.teacherId === teacherId) : classes;
  const [classId, setClassId] = useState(myClasses[0]?.id ?? "");
  const klass = classes.find((c) => c.id === classId);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [marks, setMarks] = useState<Record<string, AttendanceState>>({});
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
  const stateOf = (studentId: string) => marks[studentId] ?? "present";
  const nextNumber = editingId
    ? classSessions.find((s) => s.id === editingId)?.sessionNumber ?? "?"
    : classSessions.length + 1;

  const existingForDate = classSessions.find(
    (s) => new Date(s.date).toISOString().slice(0, 10) === date && s.id !== editingId
  );

  function resetForm(nextClassId = classId) {
    const ros = enrollments.filter((e) => e.classId === nextClassId).map((e) => e.studentId);
    setSelected(new Set(ros));
    setMarks({});
    setNote("");
    setEditingId(null);
    setDate(new Date().toISOString().slice(0, 10));
  }

  useEffect(() => {
    if (!editingId) setSelected(new Set(roster.map((s) => s.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, roster.length]);

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
  const setMark = (studentId: string, state: AttendanceState) =>
    setMarks((m) => ({ ...m, [studentId]: state }));

  function loadSession(sessId: string) {
    const sess = classSessions.find((s) => s.id === sessId);
    if (!sess) return;
    setEditingId(sess.id);
    setDate(new Date(sess.date).toISOString().slice(0, 10));
    setNote(sess.notes ?? "");
    setMarks({ ...sess.attendance });
    setSelected(new Set(Object.keys(sess.attendance)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function save() {
    if (!klass || selected.size === 0) return;
    const full: Record<string, AttendanceState> = {};
    for (const s of roster) if (selected.has(s.id)) full[s.id] = stateOf(s.id);
    saveAttendance(
      klass.id,
      klass.teacherId,
      new Date(date).getTime(),
      full,
      note.trim() || undefined,
      editingId ?? undefined
    );
    setFlash(editingId ? t("att.saved_edit") : t("att.saved"));
    resetForm();
  }

  const presentCount = roster.filter((s) => selected.has(s.id) && stateOf(s.id) === "present").length;

  return (
    <div className="stack att">
      <header className="page-head">
        <div className="page-title">
          <h1>{t("att.title_call")}</h1>
          <p>{t("att.subtitle")}</p>
        </div>
      </header>

      <div className="att-picker">
        <label className="field">
          <span>{t("nav.sessions")}</span>
          <select
            className="input"
            value={classId}
            onChange={(e) => { setClassId(e.target.value); resetForm(e.target.value); }}
          >
            {myClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {subjName(c.subjectId)} · {t(`days.${c.dayOfWeek}`)} {c.timeSlot}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t("att.date")}</span>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      {flash && (
        <p className="att-flash">
          <CircleCheck size={16} /> {flash}
        </p>
      )}

      {klass && roster.length > 0 ? (
        <div className="card stack">
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

          {existingForDate && !editingId && (
            <div className="att-warn">
              <TriangleAlert size={17} />
              <span>
                {t("att.dup_warn", {
                  n: existingForDate.sessionNumber ?? "?",
                  date: formatDate(existingForDate.date),
                })}
              </span>
              <button className="btn btn-ghost sm" onClick={() => loadSession(existingForDate.id)}>
                {t("att.edit_this")}
              </button>
            </div>
          )}

          <ul className="att-list">
            {roster.map((s) => {
              const on = selected.has(s.id);
              return (
                <li key={s.id} className={"att-row" + (on ? "" : " off")}>
                  <label className="att-name">
                    <input type="checkbox" checked={on} onChange={() => toggleSelected(s.id)} />
                    <span className="att-initials" aria-hidden="true">{initials(s.name)}</span>
                    <strong>{s.name}</strong>
                  </label>
                  {on && (
                    <div className="seg" role="group" aria-label={s.name}>
                      {STATES.map((st) => (
                        <button
                          key={st}
                          className={"seg-btn" + (stateOf(s.id) === st ? " on " + segClass(st) : "")}
                          onClick={() => setMark(s.id, st)}
                        >
                          {t(`attendance.${st}`)}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <label className="field">
            <span><StickyNote size={13} /> {t("att.note_label")}</span>
            <textarea
              className="input"
              placeholder={t("att.note_placeholder")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          <div className="row-actions">
            {editingId && (
              <button className="btn btn-ghost" onClick={() => resetForm()}>
                <X size={16} /> {t("att.cancel_edit")}
              </button>
            )}
            <button className="btn btn-primary btn-lg" onClick={save} disabled={selected.size === 0}>
              <Save size={17} />
              {editingId ? t("att.save_edit") : t("att.save", { count: selected.size })}
            </button>
          </div>
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

      <h2 className="section-title"><History size={16} /> {t("att.history")}</h2>
      <div className="stack">
        {classSessions.map((sess) => (
          <div key={sess.id} className="card att-history">
            <div className="att-history-main">
              <strong>
                {t("att.session_n", { n: sess.sessionNumber ?? "?" })} · {formatDate(sess.date)}
              </strong>
              {sess.notes && (
                <div className="muted small att-history-note">
                  <StickyNote size={13} /> {sess.notes}
                </div>
              )}
              <div className="att-history-marks">
                {Object.entries(sess.attendance).map(([sid, st]) => {
                  const name = students.find((s) => s.id === sid)?.name ?? "?";
                  return (
                    <span key={sid} className={"pill " + segClass(st)}>
                      {name.split(" ")[0]} · {t(`attendance.${st}`)}
                    </span>
                  );
                })}
              </div>
            </div>
            <button className="btn btn-ghost sm" onClick={() => loadSession(sess.id)}>
              <Pencil size={14} /> {t("common.edit")}
            </button>
          </div>
        ))}
        {classSessions.length === 0 && (
          <div className="card">
            <div className="empty-state">
              <span className="empty-state-icon"><ClipboardList size={24} /></span>
              <strong>{t("att.no_session")}</strong>
              <p>{t("att.no_session_hint")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------- Élève / parent : lecture seule */

function StudentAttendance() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { students, sessions, classes, subjects } = useData();
  const student = students.find((s) => s.id === profile?.linkedStudentId);

  const rows = useMemo(() => {
    if (!student) return [];
    return sessions
      .filter((s) => s.attendance[student.id] !== undefined)
      .sort((a, b) => b.date - a.date)
      .map((s) => {
        const klass = classes.find((c) => c.id === s.classId);
        const subj = subjects.find((su) => su.id === klass?.subjectId)?.name ?? "—";
        return { id: s.id, date: s.date, subj, state: s.attendance[student.id], note: s.notes };
      });
  }, [student, sessions, classes, subjects]);

  const present = rows.filter((r) => r.state === "present").length;
  const rate = rows.length > 0 ? Math.round((present / rows.length) * 100) : null;

  if (!student) return <p className="muted">{t("dash.no_student_link")}</p>;

  return (
    <div className="stack att">
      <header className="page-head">
        <div className="page-title">
          <h1>{t("att.title_student")}</h1>
          <p>{student.name}</p>
        </div>
        {rate !== null && (
          <span className="pill pill-ok att-rate">
            <CircleCheck size={14} /> {t("dash.attendance_rate")} : {rate}%
          </span>
        )}
      </header>

      {rows.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon"><ClipboardList size={24} /></span>
            <strong>{t("att.no_history")}</strong>
            <p>{t("att.no_history_hint")}</p>
          </div>
        </div>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t("att.date")}</th>
                <th>{t("nav.subjects")}</th>
                <th>{t("att.state")}</th>
                <th>{t("att.note_label")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{formatDate(r.date)}</td>
                  <td>{r.subj}</td>
                  <td><span className={"pill " + segClass(r.state)}>{t(`attendance.${r.state}`)}</span></td>
                  <td className="muted">{r.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function segClass(state: AttendanceState) {
  return state === "present" ? "pill-ok" : state === "absent_paid" ? "pill-warn" : "pill-muted";
}

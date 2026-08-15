import { useEffect, useMemo, useState } from "react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { ATTENDANCE_LABEL, DAY_LABEL } from "../../lib/labels";
import { formatDate } from "../../lib/format";
import type { AttendanceState } from "../../lib/types";
import AttendanceGrid from "./AttendanceGrid";
import GroupPicker, { EMPTY_FILTERS, type GroupFilters } from "../../components/GroupPicker";

const STATES: AttendanceState[] = ["present", "absent_paid", "absent_free"];

export default function AttendancePage() {
  const { role, profile } = useAuth();

  if (role === "student") return <StudentAttendance />;
  return <TeacherAttendance teacherId={role === "teacher" ? profile?.teacherId : undefined} />;
}

// ---- Teacher / admin: mark attendance ----
function TeacherAttendance({ teacherId }: { teacherId?: string }) {
  const { classes, students, enrollments, sessions } = useData();
  const saveAttendance = useData((s) => s.saveAttendance);

  const myClasses = teacherId ? classes.filter((c) => c.teacherId === teacherId) : classes;
  const [classId, setClassId] = useState(myClasses[0]?.id ?? "");
  const [filters, setFilters] = useState<GroupFilters>(EMPTY_FILTERS);
  // Three distinct jobs, three tabs — marking a session, reading the whole
  // register, and revisiting past sessions were all stacked on one screen.
  const [tab, setTab] = useState<"mark" | "register" | "history">("mark");
  const klass = classes.find((c) => c.id === classId);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [marks, setMarks] = useState<Record<string, AttendanceState>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set()); // students included in this session
  const [editingId, setEditingId] = useState<string | null>(null); // editing an existing session

  const roster = useMemo(() => {
    return enrollments
      .filter((e) => e.classId === classId)
      .map((e) => students.find((s) => s.id === e.studentId))
      .filter((s): s is NonNullable<typeof s> => !!s);
  }, [enrollments, students, classId]);

  const classSessions = useMemo(
    () => sessions.filter((s) => s.classId === classId).sort((a, b) => b.date - a.date),
    [sessions, classId]
  );

  const stateOf = (studentId: string) => marks[studentId] ?? "present";
  const nextNumber = editingId
    ? classSessions.find((s) => s.id === editingId)?.sessionNumber ?? "?"
    : classSessions.length + 1;

  // Avoid duplicates: a session already recorded for this group on the chosen date.
  const existingForDate = classSessions.find(
    (s) => new Date(s.date).toISOString().slice(0, 10) === date && s.id !== editingId
  );

  // Reset the form to a fresh session for the current class (all students selected).
  function resetForm(nextClassId = classId) {
    const ros = enrollments.filter((e) => e.classId === nextClassId).map((e) => e.studentId);
    setSelected(new Set(ros));
    setMarks({});
    setNote("");
    setEditingId(null);
    setDate(new Date().toISOString().slice(0, 10));
  }
  // Default: all enrolled students selected (unless editing a past session).
  useEffect(() => {
    if (!editingId) setSelected(new Set(roster.map((s) => s.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, roster.length]);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function setMark(studentId: string, state: AttendanceState) {
    setMarks((m) => ({ ...m, [studentId]: state }));
  }

  function loadSession(sessId: string) {
    const sess = classSessions.find((s) => s.id === sessId);
    if (!sess) return;
    setEditingId(sess.id);
    setDate(new Date(sess.date).toISOString().slice(0, 10));
    setNote(sess.notes ?? "");
    setMarks({ ...sess.attendance });
    setSelected(new Set(Object.keys(sess.attendance)));
    setTab("mark");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function save() {
    if (!klass || selected.size === 0) return;
    const full: Record<string, AttendanceState> = {};
    for (const s of roster) if (selected.has(s.id)) full[s.id] = stateOf(s.id);
    saveAttendance(klass.id, klass.teacherId, new Date(date).getTime(), full, note.trim() || undefined, editingId ?? undefined);
    alert(editingId ? "Séance modifiée." : "Présence enregistrée. Parents notifiés.");
    resetForm();
  }

  return (
    <div className="stack">
      <h1>Présence — appel</h1>

      {/* Narrow by teacher / level / subject, then pick the group. */}
      <GroupPicker
        classes={myClasses}
        filters={filters}
        onFilters={setFilters}
        value={classId}
        onChange={(id) => { setClassId(id); resetForm(id); }}
      />
      <nav className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "mark"} className={"tab" + (tab === "mark" ? " on" : "")} onClick={() => setTab("mark")}>
          Appel
        </button>
        <button role="tab" aria-selected={tab === "register"} className={"tab" + (tab === "register" ? " on" : "")} onClick={() => setTab("register")}>
          Registre
        </button>
        <button role="tab" aria-selected={tab === "history"} className={"tab" + (tab === "history" ? " on" : "")} onClick={() => setTab("history")}>
          Historique ({classSessions.length})
        </button>
      </nav>

      {tab === "mark" && (
      <>
      <div className="toolbar">
        <label className="field">
          <span className="muted small">Date de la séance</span>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      {klass && roster.length > 0 ? (
        <div className="card stack">
          <div className="attend-toolbar">
            <span className="pill pill-soft">Séance n° {nextNumber}{editingId ? " (modification)" : ""}</span>
            <span className="muted small">Créneau habituel : {DAY_LABEL[klass.dayOfWeek]} {klass.timeSlot}</span>
            <div className="row-actions">
              <button className="btn btn-ghost sm" onClick={() => setSelected(new Set(roster.map((s) => s.id)))}>Tout</button>
              <button className="btn btn-ghost sm" onClick={() => setSelected(new Set())}>Aucun</button>
            </div>
          </div>

          {existingForDate && !editingId && (
            <div className="dup-warn">
              ⚠️ Une séance (n° {existingForDate.sessionNumber}) existe déjà pour ce groupe le {formatDate(existingForDate.date)}.
              <button className="btn btn-ghost sm" onClick={() => loadSession(existingForDate.id)}>Modifier cette séance</button>
            </div>
          )}

          {roster.map((s) => {
            const on = selected.has(s.id);
            return (
              <div key={s.id} className={"attend-row" + (on ? "" : " dimmed")}>
                <label className="attend-name">
                  <input type="checkbox" checked={on} onChange={() => toggleSelected(s.id)} />
                  <strong>{s.name}</strong>
                </label>
                {on && (
                  <div className="seg">
                    {STATES.map((st) => (
                      <button key={st} className={"seg-btn " + (stateOf(s.id) === st ? "on " + segClass(st) : "")} onClick={() => setMark(s.id, st)}>
                        {ATTENDANCE_LABEL[st]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <textarea className="input" placeholder="Note de séance (visible par le parent)…" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="row-actions">
            {editingId && <button className="btn btn-ghost" onClick={() => resetForm()}>Annuler la modification</button>}
            <button className="btn btn-primary btn-lg" onClick={save} disabled={selected.size === 0}>
              💾 {editingId ? "Enregistrer les modifications" : `Enregistrer (${selected.size} élève${selected.size > 1 ? "s" : ""})`}
            </button>
          </div>
        </div>
      ) : (
        <p className="muted">Aucun étudiant inscrit à cette classe.</p>
      )}
      </>
      )}

      {/* Whole register at a glance — the shape the centre already works in. */}
      {tab === "register" && <AttendanceGrid classId={classId} />}

      {tab === "history" && (
      <div className="stack">
        {classSessions.map((sess) => (
          <div key={sess.id} className="card history-row">
            <div>
              <strong>Séance {sess.sessionNumber ?? "?"} · {formatDate(sess.date)}</strong>
              {sess.notes && <div className="muted small">📝 {sess.notes}</div>}
              <div className="history-marks">
                {Object.entries(sess.attendance).map(([sid, st]) => {
                  const name = students.find((s) => s.id === sid)?.name ?? "?";
                  return <span key={sid} className={"pill " + segClass(st)}>{name.split(" ")[0]}: {ATTENDANCE_LABEL[st]}</span>;
                })}
              </div>
            </div>
            <button className="btn btn-ghost sm" onClick={() => loadSession(sess.id)}>✏️ Modifier</button>
          </div>
        ))}
        {classSessions.length === 0 && <p className="muted">Pas encore de séance enregistrée.</p>}
      </div>
      )}
    </div>
  );
}

// ---- Student / parent: read-only history ----
function StudentAttendance() {
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
        const subj = subjects.find((su) => su.id === klass?.subjectId)?.name ?? "?";
        return { id: s.id, date: s.date, subj, state: s.attendance[student.id], note: s.notes };
      });
  }, [student, sessions, classes, subjects]);

  if (!student) return <p className="muted">Aucun étudiant lié à ce compte.</p>;

  return (
    <div className="stack">
      <h1>Présence — {student.name}</h1>
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr><th>Date</th><th>Matière</th><th>État</th><th>Note</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{formatDate(r.date)}</td>
                <td>{r.subj}</td>
                <td><span className={"pill " + segClass(r.state)}>{ATTENDANCE_LABEL[r.state]}</span></td>
                <td className="muted">{r.note ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="muted center">Aucun historique.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function segClass(state: AttendanceState) {
  return state === "present" ? "pill-ok" : state === "absent_paid" ? "pill-warn" : "pill-muted";
}

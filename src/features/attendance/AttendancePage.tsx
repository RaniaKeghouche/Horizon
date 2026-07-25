import { useMemo, useState } from "react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { ATTENDANCE_LABEL, DAY_LABEL } from "../../lib/labels";
import { formatDate } from "../../lib/format";
import type { AttendanceState } from "../../lib/types";

const STATES: AttendanceState[] = ["present", "absent_paid", "absent_free"];

export default function AttendancePage() {
  const { role, profile } = useAuth();

  if (role === "student") return <StudentAttendance />;
  return <TeacherAttendance teacherId={role === "teacher" ? profile?.teacherId : undefined} />;
}

// ---- Teacher / admin: mark attendance ----
function TeacherAttendance({ teacherId }: { teacherId?: string }) {
  const { classes, subjects, students, enrollments, sessions } = useData();
  const saveAttendance = useData((s) => s.saveAttendance);

  const myClasses = teacherId ? classes.filter((c) => c.teacherId === teacherId) : classes;
  const [classId, setClassId] = useState(myClasses[0]?.id ?? "");
  const klass = classes.find((c) => c.id === classId);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [marks, setMarks] = useState<Record<string, AttendanceState>>({});

  const roster = useMemo(() => {
    return enrollments
      .filter((e) => e.classId === classId)
      .map((e) => students.find((s) => s.id === e.studentId))
      .filter((s): s is NonNullable<typeof s> => !!s);
  }, [enrollments, students, classId]);

  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "?";
  const stateOf = (studentId: string) => marks[studentId] ?? "present";

  function setMark(studentId: string, state: AttendanceState) {
    setMarks((m) => ({ ...m, [studentId]: state }));
  }

  function save() {
    if (!klass || roster.length === 0) return;
    const full: Record<string, AttendanceState> = {};
    for (const s of roster) full[s.id] = stateOf(s.id);
    saveAttendance(klass.id, klass.teacherId, new Date(date).getTime(), full, note.trim() || undefined);
    setNote("");
    setMarks({});
    alert("Présence enregistrée. Parents notifiés.");
  }

  const classSessions = sessions
    .filter((s) => s.classId === classId)
    .sort((a, b) => b.date - a.date);

  return (
    <div className="stack">
      <h1>Présence</h1>

      <div className="toolbar">
        <select className="input" value={classId} onChange={(e) => { setClassId(e.target.value); setMarks({}); }}>
          {myClasses.map((c) => (
            <option key={c.id} value={c.id}>
              {subjName(c.subjectId)} · {DAY_LABEL[c.dayOfWeek]} {c.timeSlot}
            </option>
          ))}
        </select>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {klass && roster.length > 0 ? (
        <>
          <div className="card stack">
            {roster.map((s) => (
              <div key={s.id} className="attend-row">
                <strong>{s.name}</strong>
                <div className="seg">
                  {STATES.map((st) => (
                    <button
                      key={st}
                      className={"seg-btn " + (stateOf(s.id) === st ? "on " + segClass(st) : "")}
                      onClick={() => setMark(s.id, st)}
                    >
                      {ATTENDANCE_LABEL[st]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <textarea
              className="input"
              placeholder="Note de séance (visible par le parent)…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button className="btn btn-primary btn-lg" onClick={save}>💾 Enregistrer la présence</button>
          </div>
        </>
      ) : (
        <p className="muted">Aucun étudiant inscrit à cette classe.</p>
      )}

      <h3 className="section-title">Historique</h3>
      <div className="stack">
        {classSessions.map((sess) => (
          <div key={sess.id} className="card history-row">
            <div>
              <strong>{formatDate(sess.date)}</strong>
              {sess.notes && <div className="muted small">📝 {sess.notes}</div>}
            </div>
            <div className="history-marks">
              {Object.entries(sess.attendance).map(([sid, st]) => {
                const name = students.find((s) => s.id === sid)?.name ?? "?";
                return <span key={sid} className={"pill " + segClass(st)}>{name.split(" ")[0]}: {ATTENDANCE_LABEL[st]}</span>;
              })}
            </div>
          </div>
        ))}
        {classSessions.length === 0 && <p className="muted">Pas encore de séance enregistrée.</p>}
      </div>
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

import { useMemo, useState } from "react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { formatDate, billingMonth, formatDA } from "../../lib/format";
import { ATTENDANCE_LABEL, DAY_LABEL, LEVEL_LABEL } from "../../lib/labels";
import type { AttendanceState } from "../../lib/types";

// Overview: every group → its sessions grouped by month → each student's attendance
// and paid/unpaid status for that exact session. Admin sees all groups; a teacher sees
// only their own groups (cahier: prof consulte ses groupes, élèves, présences, paiement).
export default function SessionsPage() {
  const { role, profile } = useAuth();
  const { classes, subjects, teachers, students, enrollments, sessions, payments } = useData();

  const myClasses = useMemo(
    () => (role === "teacher" && profile?.teacherId ? classes.filter((c) => c.teacherId === profile.teacherId) : classes),
    [classes, role, profile]
  );
  const [classId, setClassId] = useState(myClasses[0]?.id ?? "");

  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "?";
  const teacherName = (id: string) => teachers.find((t) => t.id === id)?.name ?? "?";
  const studentName = (id: string) => students.find((s) => s.id === id)?.name ?? "?";

  const klass = classes.find((c) => c.id === classId);

  // Sessions of the selected class, grouped by month (ascending).
  const byMonth = useMemo(() => {
    const map = new Map<string, typeof sessions>();
    sessions
      .filter((s) => s.classId === classId)
      .sort((a, b) => a.date - b.date)
      .forEach((s) => {
        const m = billingMonth(new Date(s.date));
        if (!map.has(m)) map.set(m, []);
        map.get(m)!.push(s);
      });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [sessions, classId]);

  function payStatus(sessionId: string, studentId: string): "paid" | "unpaid" | "free" {
    const p = payments.find((x) => x.sessionId === sessionId && x.studentId === studentId);
    if (!p) return "free";
    return p.status;
  }

  const totalUnpaid = useMemo(() => {
    return payments
      .filter((p) => p.status === "unpaid" && sessions.some((s) => s.id === p.sessionId && s.classId === classId))
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments, sessions, classId]);

  const segClass = (st: AttendanceState) =>
    st === "present" ? "pill-ok" : st === "absent_paid" ? "pill-warn" : "pill-muted";

  return (
    <div className="stack">
      <div className="page-head">
        <h1>{role === "teacher" ? "Mes groupes" : "Séances par groupe"}</h1>
        <select className="input" style={{ maxWidth: 320 }} value={classId} onChange={(e) => setClassId(e.target.value)}>
          {myClasses.map((c) => (
            <option key={c.id} value={c.id}>
              {subjName(c.subjectId)} · {DAY_LABEL[c.dayOfWeek]} {c.timeSlot} · {teacherName(c.teacherId)}
            </option>
          ))}
        </select>
      </div>
      {myClasses.length === 0 && <p className="muted">Aucun groupe pour l'instant.</p>}

      {klass && (
        <p className="muted">
          {klass.currentStudents} élève(s) · {sessions.filter((s) => s.classId === classId).length} séance(s) ·{" "}
          {totalUnpaid > 0 ? <span className="text-danger">impayé : {formatDA(totalUnpaid)}</span> : <span className="text-ok">tout payé</span>}
        </p>
      )}

      {/* Roster: the students enrolled in this group (créneau). */}
      {klass && (() => {
        const roster = enrollments
          .filter((e) => e.classId === classId)
          .map((e) => students.find((s) => s.id === e.studentId))
          .filter((s): s is NonNullable<typeof s> => !!s);
        return (
          <div className="card">
            <h3 className="section-title" style={{ marginTop: 0 }}>Élèves du groupe ({roster.length})</h3>
            {roster.length === 0 ? (
              <p className="muted">Aucun élève inscrit dans ce groupe.</p>
            ) : (
              <div className="chip-row">
                {roster.map((s) => (
                  <span key={s.id} className="chip-selected">{s.name} · {LEVEL_LABEL[s.level]}</span>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {byMonth.length === 0 && <p className="muted">Aucune séance pour ce groupe.</p>}

      {byMonth.map(([month, monthSessions]) => (
        <div key={month} className="stack">
          <h3 className="section-title">📅 {month}</h3>
          {monthSessions.map((sess) => (
            <div key={sess.id} className="card">
              <div className="req-head" style={{ marginBottom: "0.5rem" }}>
                <strong>Séance {sess.sessionNumber ?? "?"}</strong>
                <span className="muted small">{formatDate(sess.date)}</span>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Élève</th><th>Présence</th><th>Paiement</th></tr></thead>
                  <tbody>
                    {Object.entries(sess.attendance).map(([sid, st]) => {
                      const ps = payStatus(sess.id, sid);
                      return (
                        <tr key={sid}>
                          <td>{studentName(sid)}</td>
                          <td><span className={"pill " + segClass(st)}>{ATTENDANCE_LABEL[st]}</span></td>
                          <td>
                            {ps === "free"
                              ? <span className="muted small">non facturée</span>
                              : ps === "paid"
                              ? <span className="pill pill-ok">✓ payé</span>
                              : <span className="pill pill-danger">✕ non payé</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

import { useMemo, useState } from "react";
import { useData } from "../../data/store";
import { formatDate, billingMonth, formatDA } from "../../lib/format";
import { ATTENDANCE_LABEL, DAY_LABEL } from "../../lib/labels";
import type { AttendanceState } from "../../lib/types";

// Overview: every group → its sessions grouped by month → each student's attendance
// and paid/unpaid status for that exact session (cahier: "qui a payé / qui n'a pas payé").
export default function SessionsPage() {
  const { classes, subjects, teachers, students, sessions, payments } = useData();
  const [classId, setClassId] = useState(classes[0]?.id ?? "");

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
        <h1>Séances par groupe</h1>
        <select className="input" style={{ maxWidth: 320 }} value={classId} onChange={(e) => setClassId(e.target.value)}>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {subjName(c.subjectId)} · {DAY_LABEL[c.dayOfWeek]} {c.timeSlot} · {teacherName(c.teacherId)}
            </option>
          ))}
        </select>
      </div>

      {klass && (
        <p className="muted">
          {klass.currentStudents} élève(s) · {sessions.filter((s) => s.classId === classId).length} séance(s) ·{" "}
          {totalUnpaid > 0 ? <span className="text-danger">impayé : {formatDA(totalUnpaid)}</span> : <span className="text-ok">tout payé</span>}
        </p>
      )}

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

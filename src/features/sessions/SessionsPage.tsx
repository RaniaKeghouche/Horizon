import { useMemo, useState } from "react";
import { CalendarDays, ChevronRight } from "lucide-react";
import { useData } from "../../data/store";
import GroupPicker, { EMPTY_FILTERS, type GroupFilters } from "../../components/GroupPicker";
import { useAuth } from "../auth/AuthContext";
import { formatDate, billingMonth, formatDA } from "../../lib/format";
import { ATTENDANCE_LABEL, LEVEL_LABEL } from "../../lib/labels";
import type { AttendanceState } from "../../lib/types";

// Overview: every group → its sessions grouped by month → each student's attendance
// and paid/unpaid status for that exact session. Admin sees all groups; a teacher sees
// only their own groups (cahier: prof consulte ses groupes, élèves, présences, paiement).
export default function SessionsPage() {
  const { role, profile } = useAuth();
  const { classes, students, enrollments, sessions, payments } = useData();

  const myClasses = useMemo(
    () => (role === "teacher" && profile?.teacherId ? classes.filter((c) => c.teacherId === profile.teacherId) : classes),
    [classes, role, profile]
  );
  const [classId, setClassId] = useState(myClasses[0]?.id ?? "");
  const [filters, setFilters] = useState<GroupFilters>(EMPTY_FILTERS);
  // Roster and session history are two different questions — don't answer both
  // at once on one very long page.
  const [tab, setTab] = useState<"roster" | "sessions">("roster");

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
      </div>

      {/* Same picker as the attendance screen: teacher / level / subject, then group. */}
      <GroupPicker
        classes={myClasses}
        filters={filters}
        onFilters={setFilters}
        value={classId}
        onChange={setClassId}
      />
      {myClasses.length === 0 && <p className="muted">Aucun groupe pour l'instant.</p>}

      {klass && (
        <p className="muted">
          {klass.currentStudents} élève(s) · {sessions.filter((s) => s.classId === classId).length} séance(s) ·{" "}
          {totalUnpaid > 0 ? <span className="text-danger">impayé : {formatDA(totalUnpaid)}</span> : <span className="text-ok">tout payé</span>}
        </p>
      )}

      {klass && (
        <nav className="tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "roster"}
            className={"tab" + (tab === "roster" ? " on" : "")}
            onClick={() => setTab("roster")}
          >
            Élèves ({klass.currentStudents})
          </button>
          <button
            role="tab"
            aria-selected={tab === "sessions"}
            className={"tab" + (tab === "sessions" ? " on" : "")}
            onClick={() => setTab("sessions")}
          >
            Séances ({sessions.filter((s) => s.classId === classId).length})
          </button>
        </nav>
      )}

      {/* Roster: the students enrolled in this group (créneau). */}
      {tab === "roster" && klass && (() => {
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
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Élève</th><th>Niveau</th><th>Paiement</th></tr></thead>
                  <tbody>
                    {roster.map((s) => {
                      const enr = enrollments.find((e) => e.studentId === s.id && e.classId === classId);
                      const due = payments.filter((p) => p.enrollmentId === enr?.id && p.status === "unpaid").reduce((a, p) => a + p.amount, 0);
                      return (
                        <tr key={s.id}>
                          <td>{s.name}</td>
                          <td>{LEVEL_LABEL[s.level]}</td>
                          <td>{due > 0 ? <span className="pill pill-danger">Doit {formatDA(due)}</span> : <span className="pill pill-ok">✓ payé</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {tab === "sessions" && byMonth.length === 0 && <p className="muted">Aucune séance pour ce groupe.</p>}

      {tab === "sessions" && byMonth.map(([month, monthSessions]) => (
        <div key={month} className="stack">
          <h3 className="section-title">
            <CalendarDays size={16} aria-hidden /> {month}
          </h3>
          {monthSessions.map((sess) => {
            // Collapsed by default: the summary answers "who was missing / who
            // still owes" without unrolling a table per session.
            const marks = Object.entries(sess.attendance);
            const absent = marks.filter(([, st]) => st !== "present").length;
            const unpaid = marks.filter(([sid]) => payStatus(sess.id, sid) === "unpaid").length;
            return (
            <details key={sess.id} className="card sess-card">
              <summary className="sess-summary">
                <ChevronRight size={16} className="sess-caret" aria-hidden />
                <strong>Séance {sess.sessionNumber ?? "?"}</strong>
                <span className="muted small">{formatDate(sess.date)}</span>
                <span className="sess-tags">
                  <span className="pill pill-soft">{marks.length} présent(s) noté(s)</span>
                  {absent > 0 && <span className="pill pill-warn">{absent} absent(s)</span>}
                  {unpaid > 0 && <span className="pill pill-danger">{unpaid} non payé(s)</span>}
                </span>
              </summary>
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
            </details>
            );
          })}
        </div>
      ))}
    </div>
  );
}

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Users, ClipboardList, Wallet, CalendarDays } from "lucide-react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { formatDate, billingMonth, formatDA } from "../../lib/format";
import { LEVEL_LABEL } from "../../lib/labels";
import type { AttendanceState } from "../../lib/types";

// Overview: every group → its sessions grouped by month → each student's attendance
// and paid/unpaid status for that exact session. Admin sees all groups; a teacher sees
// only their own groups (cahier: prof consulte ses groupes, élèves, présences, paiement).
export default function SessionsPage() {
  const { t } = useTranslation();
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
      <header className="page-head">
        <div className="page-title">
          <h1>{role === "teacher" ? t("dash.my_groups") : t("grp.title_admin")}</h1>
          {klass && (
            <p>
              {t("grp.summary", {
                students: klass.currentStudents,
                sessions: sessions.filter((s) => s.classId === classId).length,
              })}
            </p>
          )}
        </div>
        {myClasses.length > 0 && (
          <select className="input grp-picker" value={classId} onChange={(e) => setClassId(e.target.value)}>
            {myClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {subjName(c.subjectId)} · {t(`days.${c.dayOfWeek}`)} {c.timeSlot} · {teacherName(c.teacherId)}
              </option>
            ))}
          </select>
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
        <div className="grid-cards">
          <div className="card stat-card">
            <span className="stat-icon badge-blue"><Users size={20} /></span>
            <div className="stat-body">
              <span className="stat-value">{klass.currentStudents}/{klass.maxStudents}</span>
              <span className="stat-label">{t("grp.enrolled")}</span>
            </div>
          </div>
          <div className="card stat-card">
            <span className="stat-icon badge-green"><ClipboardList size={20} /></span>
            <div className="stat-body">
              <span className="stat-value">{sessions.filter((s) => s.classId === classId).length}</span>
              <span className="stat-label">{t("dash.sessions_held")}</span>
            </div>
          </div>
          <div className="card stat-card">
            <span className={"stat-icon " + (totalUnpaid > 0 ? "badge-red" : "badge-green")}>
              <Wallet size={20} />
            </span>
            <div className="stat-body">
              <span className={"stat-value " + (totalUnpaid > 0 ? "text-danger" : "text-ok")}>
                {totalUnpaid > 0 ? formatDA(totalUnpaid) : t("grp.all_paid")}
              </span>
              <span className="stat-label">{t("payments.unpaid")}</span>
            </div>
          </div>
        </div>
      )}

      {/* Roster: the students enrolled in this group (créneau). */}
      {klass && (() => {
        const roster = enrollments
          .filter((e) => e.classId === classId)
          .map((e) => students.find((s) => s.id === e.studentId))
          .filter((s): s is NonNullable<typeof s> => !!s);
        return (
          <div className="card">
            <h3 className="section-title" style={{ marginTop: 0 }}>
              <Users size={16} /> {t("grp.roster", { n: roster.length })}
            </h3>
            {roster.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon"><Users size={24} /></span>
                <strong>{t("att.no_roster")}</strong>
                <p>{t("att.no_roster_hint")}</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>{t("nav.students")}</th><th>{t("stu.level")}</th><th>{t("nav.payments")}</th></tr></thead>
                  <tbody>
                    {roster.map((s) => {
                      const enr = enrollments.find((e) => e.studentId === s.id && e.classId === classId);
                      const due = payments.filter((p) => p.enrollmentId === enr?.id && p.status === "unpaid").reduce((a, p) => a + p.amount, 0);
                      return (
                        <tr key={s.id}>
                          <td>{s.name}</td>
                          <td>{LEVEL_LABEL[s.level]}</td>
                          <td>
                            {due > 0
                              ? <span className="pill pill-danger">{formatDA(due)}</span>
                              : <span className="pill pill-ok">{t("payments.paid")}</span>}
                          </td>
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

      {byMonth.length === 0 && klass && (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon"><ClipboardList size={24} /></span>
            <strong>{t("att.no_session")}</strong>
            <p>{t("att.no_session_hint")}</p>
          </div>
        </div>
      )}

      {byMonth.map(([month, monthSessions]) => (
        <div key={month} className="stack">
          <h3 className="section-title"><CalendarDays size={16} /> {month}</h3>
          {monthSessions.map((sess) => (
            <div key={sess.id} className="card">
              <div className="req-head" style={{ marginBottom: "0.5rem" }}>
                <strong>{t("att.session_n", { n: sess.sessionNumber ?? "?" })}</strong>
                <span className="muted small">{formatDate(sess.date)}</span>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>{t("nav.students")}</th><th>{t("nav.attendance")}</th><th>{t("nav.payments")}</th></tr></thead>
                  <tbody>
                    {Object.entries(sess.attendance).map(([sid, st]) => {
                      const ps = payStatus(sess.id, sid);
                      return (
                        <tr key={sid}>
                          <td>{studentName(sid)}</td>
                          <td><span className={"pill " + segClass(st)}>{t(`attendance.${st}`)}</span></td>
                          <td>
                            {ps === "free"
                              ? <span className="muted small">{t("grp.not_billed")}</span>
                              : ps === "paid"
                              ? <span className="pill pill-ok">{t("payments.paid")}</span>
                              : <span className="pill pill-danger">{t("payments.unpaid")}</span>}
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

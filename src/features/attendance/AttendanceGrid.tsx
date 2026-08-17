import { useMemo } from "react";
import { useData } from "../../data/store";
import { ATTENDANCE_LABEL } from "../../lib/labels";
import type { AttendanceState } from "../../lib/types";

/** Short mark shown in a cell, mirroring the paper/Sheets register. */
const MARK: Record<AttendanceState, string> = {
  present: "P",
  absent_paid: "A",
  absent_free: "a",
};
const CELL_CLASS: Record<AttendanceState, string> = {
  present: "att-present",
  absent_paid: "att-absent-paid",
  absent_free: "att-absent-free",
};

function shortDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

/**
 * Whole-register view: one row per student, one column per session, in the same
 * shape as the Google Sheet the centre keeps by hand. Everything is derived from
 * the sessions themselves, so it always matches what was marked.
 */
export default function AttendanceGrid({ classId }: { classId: string }) {
  const { students, enrollments, sessions } = useData();

  const roster = useMemo(
    () =>
      enrollments
        .filter((e) => e.classId === classId && e.status === "active")
        .map((e) => students.find((s) => s.id === e.studentId))
        .filter((s): s is NonNullable<typeof s> => Boolean(s)),
    [enrollments, students, classId]
  );

  // Oldest first, so the register reads left-to-right like the paper one.
  const cols = useMemo(
    () => sessions.filter((s) => s.classId === classId).sort((a, b) => a.date - b.date),
    [sessions, classId]
  );

  const totals = useMemo(() => {
    const map = new Map<string, { present: number; paid: number; free: number }>();
    for (const st of roster) {
      let present = 0,
        paid = 0,
        free = 0;
      for (const ses of cols) {
        const state = ses.attendance[st.id];
        if (state === "present") present++;
        else if (state === "absent_paid") paid++;
        else if (state === "absent_free") free++;
      }
      map.set(st.id, { present, paid, free });
    }
    return map;
  }, [roster, cols]);

  if (cols.length === 0) {
    return <p className="muted">Aucune séance enregistrée pour ce groupe.</p>;
  }

  return (
    <>
      <div className="att-legend">
        <span className="att-key att-present">P</span> {ATTENDANCE_LABEL.present}
        <span className="att-key att-absent-paid">A</span> {ATTENDANCE_LABEL.absent_paid}
        <span className="att-key att-absent-free">a</span> {ATTENDANCE_LABEL.absent_free}
        <span className="att-key att-none" /> Pas encore inscrit
      </div>

      <div className="card table-wrap att-wrap">
        <table className="table att-grid">
          <thead>
            <tr>
              <th className="att-sticky att-name-col">Nom et prénom</th>
              <th className="att-sticky att-phone-col">Téléphone</th>
              {cols.map((s, i) => (
                <th key={s.id} className="att-date-col" title={new Date(s.date).toLocaleDateString()}>
                  <span className="att-date-n">{i + 1}</span>
                  {shortDate(s.date)}
                </th>
              ))}
              <th className="att-total-col">Total</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((st) => {
              const t = totals.get(st.id)!;
              return (
                <tr key={st.id}>
                  <td className="att-sticky att-name-col">{st.name}</td>
                  <td className="att-sticky att-phone-col muted small">{st.phone}</td>
                  {cols.map((ses) => {
                    const state = ses.attendance[st.id];
                    return (
                      <td
                        key={ses.id}
                        className={"att-cell " + (state ? CELL_CLASS[state] : "att-none")}
                        title={state ? ATTENDANCE_LABEL[state] : "—"}
                      >
                        {state ? MARK[state] : ""}
                      </td>
                    );
                  })}
                  <td className="att-total-col">
                    <span className="att-total-p">{t.present}</span>
                    {t.paid > 0 && <span className="att-total-a">{t.paid}</span>}
                    {t.free > 0 && <span className="att-total-f">{t.free}</span>}
                  </td>
                </tr>
              );
            })}
            {roster.length === 0 && (
              <tr>
                <td colSpan={cols.length + 3} className="muted center">
                  Aucun élève inscrit.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

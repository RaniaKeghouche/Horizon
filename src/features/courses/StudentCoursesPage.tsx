import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Check, Clock, X } from "lucide-react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { formatDA } from "../../lib/format";
import { DAY_LABEL, LEVEL_LABEL } from "../../lib/labels";

// Student view: browse every subject the school offers, pick one of the teachers
// the admin allows for it, and send a تسجيل. The admin then groups those requests
// into a class (which is when day/time/price are decided).
export default function StudentCoursesPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { students, subjects, teachers, classes, enrollments, enrollmentRequests } = useData();
  const requestEnrollment = useData((s) => s.requestEnrollment);
  const cancelEnrollmentRequest = useData((s) => s.cancelEnrollmentRequest);

  const [chosen, setChosen] = useState<Record<string, string>>({});

  const student = students.find((s) => s.id === profile?.linkedStudentId);
  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "?";
  const teacherName = (id: string) => teachers.find((x) => x.id === id)?.name ?? "?";

  const myEnrollments = useMemo(
    () => (student ? enrollments.filter((e) => e.studentId === student.id) : []),
    [enrollments, student]
  );
  const myRequests = useMemo(
    () => (student ? enrollmentRequests.filter((r) => r.studentId === student.id) : []),
    [enrollmentRequests, student]
  );

  if (!student) return <p className="muted">Aucun étudiant lié à ce compte.</p>;

  const offeredAtMyLevel = (s: (typeof subjects)[number]) =>
    (s.teachersByLevel?.[student.level] ?? []).length > 0;

  const pendingFor = (subjectId: string) =>
    myRequests.find((r) => r.subjectId === subjectId && r.status === "pending");
  const enrolledIn = (subjectId: string) =>
    myEnrollments.find((e) => e.subjectId === subjectId && e.status === "active");

  const mine = subjects.filter((s) => offeredAtMyLevel(s) || enrolledIn(s.id));
  const others = subjects.filter((s) => !mine.includes(s));

  return (
    <div className="stack">
      <h1>{t("courses.title")}</h1>
      <p className="muted">
        {t("courses.lead")} — <strong>{LEVEL_LABEL[student.level]}</strong>
      </p>

      {/* Own level first; everything else is still reachable below. */}
      <h3 className="section-title">{t("courses.myLevel")}</h3>
      <div className="chip-grid">
        {mine.map((s) => {
          const allowed = s.teachersByLevel?.[student.level] ?? [];
          const options = teachers.filter((tc) => allowed.includes(tc.id));
          const pending = pendingFor(s.id);
          const active = enrolledIn(s.id);
          const klass = active ? classes.find((c) => c.id === active.classId) : undefined;
          const pick = chosen[s.id] ?? options[0]?.id ?? "";

          return (
            <div key={s.id} className="card course-card">
              <div className="course-head">
                <span className="stat-icon badge-navy" aria-hidden="true">
                  <BookOpen size={18} />
                </span>
                <strong>{s.name}</strong>
              </div>

              {/* Already in a group: show where and what it costs. */}
              {active && klass ? (
                <>
                  <span className="pill pill-ok">
                    <Check size={12} /> {t("courses.enrolled")}
                  </span>
                  <div className="muted small">
                    {teacherName(active.teacherId)} · {DAY_LABEL[klass.dayOfWeek]} {klass.timeSlot}
                  </div>
                  <div className="muted small">
                    {formatDA(active.pricePerSession)} / {t("courses.perSession")}
                  </div>
                </>
              ) : pending ? (
                <>
                  <span className="pill pill-warn">
                    <Clock size={12} /> {t("courses.pending")}
                  </span>
                  <div className="muted small">
                    {t("courses.pendingWith")} {teacherName(pending.teacherId)}
                  </div>
                  <button className="btn btn-ghost sm" onClick={() => cancelEnrollmentRequest(pending.id)}>
                    <X size={14} /> {t("common.cancel")}
                  </button>
                </>
              ) : options.length === 0 ? (
                <span className="muted small">{t("courses.noTeacherYet")}</span>
              ) : (
                <>
                  {/* Choose among exactly the teachers the admin allowed. */}
                  <label className="field">
                    <span className="muted small">{t("courses.chooseTeacher")}</span>
                    <select
                      className="input"
                      value={pick}
                      onChange={(e) => setChosen((c) => ({ ...c, [s.id]: e.target.value }))}
                    >
                      {options.map((tc) => (
                        <option key={tc.id} value={tc.id}>
                          {tc.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="btn btn-primary sm"
                    onClick={() => requestEnrollment(student.id, s.id, pick)}
                    disabled={!pick}
                  >
                    {t("courses.enrol")}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {others.length > 0 && (
        <>
          <h3 className="section-title">{t("courses.otherLevels")}</h3>
          <p className="muted small">{t("courses.otherLevelsHint")}</p>
          <div className="chip-grid">
            {others.map((s) => {
              const levels = Object.keys(s.teachersByLevel ?? {}) as (keyof typeof LEVEL_LABEL)[];
              return (
                <div key={s.id} className="card course-card is-other-level">
                  <div className="course-head">
                    <span className="stat-icon badge-sky" aria-hidden="true">
                      <BookOpen size={18} />
                    </span>
                    <strong>{s.name}</strong>
                  </div>
                  <div className="chip-row">
                    {levels.map((lv) => (
                      <span key={lv} className="pill pill-soft">
                        {LEVEL_LABEL[lv]}
                      </span>
                    ))}
                  </div>
                  <span className="muted small">{t("courses.otherLevelNote")}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {myRequests.filter((r) => r.status === "rejected").length > 0 && (
        <>
          <h3 className="section-title">{t("courses.rejected")}</h3>
          <ul className="clean-list">
            {myRequests
              .filter((r) => r.status === "rejected")
              .map((r) => (
                <li key={r.id}>
                  {subjName(r.subjectId)} — {teacherName(r.teacherId)}
                </li>
              ))}
          </ul>
        </>
      )}
    </div>
  );
}

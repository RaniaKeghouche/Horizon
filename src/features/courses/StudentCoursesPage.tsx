import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, CalendarDays, Users, Wallet, CircleCheck } from "lucide-react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { defaultPrice } from "../../lib/payments";
import { formatDA } from "../../lib/format";
import { SESSION_TYPE_LABEL } from "../../lib/labels";

// Student view: browse the available groups (courses) and self-enroll. The admin is
// notified of each enrollment and can still edit the assignment.
export default function StudentCoursesPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { students, subjects, teachers, classes, enrollments } = useData();
  const selfEnroll = useData((s) => s.selfEnroll);

  const student = students.find((s) => s.id === profile?.linkedStudentId);

  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "?";
  const teacherName = (id: string) => teachers.find((t) => t.id === id)?.name ?? "?";

  const myEnrollments = useMemo(
    () => (student ? enrollments.filter((e) => e.studentId === student.id) : []),
    [enrollments, student]
  );
  const isEnrolled = (classId: string) => myEnrollments.some((e) => e.classId === classId);

  if (!student) return <p className="muted">{t("dash.no_student_link")}</p>;

  return (
    <div className="stack">
      <header className="page-head">
        <div className="page-title">
          <h1>{t("crs.title")}</h1>
          <p>{t("crs.subtitle")}</p>
        </div>
      </header>

      {classes.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon"><BookOpen size={24} /></span>
            <strong>{t("crs.none")}</strong>
            <p>{t("crs.none_hint")}</p>
          </div>
        </div>
      ) : (
        <div className="grid-cards">
          {classes.map((c) => {
            const enrolled = isEnrolled(c.id);
            const full = c.currentStudents >= c.maxStudents;
            const price = defaultPrice(c.sessionType, c.level);
            return (
              <div key={c.id} className="card course-card">
                <div className="course-head">
                  <span className="stat-icon badge-violet"><BookOpen size={18} /></span>
                  <div>
                    <strong>{subjName(c.subjectId)}</strong>
                    <div className="muted small">{SESSION_TYPE_LABEL[c.sessionType]} · {teacherName(c.teacherId)}</div>
                  </div>
                </div>
                <ul className="course-facts">
                  <li><CalendarDays size={13} /> {t(`days.${c.dayOfWeek}`)} {c.timeSlot}</li>
                  <li><Users size={13} /> {c.currentStudents}/{c.maxStudents}</li>
                  {price != null && <li><Wallet size={13} /> {formatDA(price)}{t("pmt.per_session")}</li>}
                </ul>
                {enrolled ? (
                  <span className="pill pill-ok"><CircleCheck size={13} /> {t("crs.enrolled")}</span>
                ) : full ? (
                  <span className="pill pill-danger">{t("crs.full")}</span>
                ) : (
                  <button className="btn btn-primary sm" onClick={() => selfEnroll(student.id, c.id)}>
                    {t("crs.enrol")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

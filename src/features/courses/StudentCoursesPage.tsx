import { useMemo } from "react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { defaultPrice } from "../../lib/payments";
import { formatDA } from "../../lib/format";
import { DAY_LABEL, SESSION_TYPE_LABEL } from "../../lib/labels";

// Student view: browse the available groups (courses) and self-enroll. The admin is
// notified of each enrollment and can still edit the assignment.
export default function StudentCoursesPage() {
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

  if (!student) return <p className="muted">Aucun étudiant lié à ce compte.</p>;

  return (
    <div className="stack">
      <h1>Cours disponibles</h1>
      <p className="muted">Choisissez les cours qui vous intéressent — vous êtes inscrit(e) directement. L'administration est notifiée.</p>

      <div className="grid-cards">
        {classes.map((c) => {
          const enrolled = isEnrolled(c.id);
          const full = c.currentStudents >= c.maxStudents;
          const price = defaultPrice(c.sessionType, c.level);
          return (
            <div key={c.id} className="card course-card">
              <div className="course-head">
                <span className="stat-icon badge-violet" style={{ width: 44, height: 44, fontSize: "1.2rem" }}>📘</span>
                <div>
                  <strong>{subjName(c.subjectId)}</strong>
                  <div className="muted small">{SESSION_TYPE_LABEL[c.sessionType]} · {teacherName(c.teacherId)}</div>
                </div>
              </div>
              <div className="muted small">
                🗓️ {DAY_LABEL[c.dayOfWeek]} {c.timeSlot} · 👥 {c.currentStudents}/{c.maxStudents}
                {price != null && <> · 💰 {formatDA(price)}/séance</>}
              </div>
              {enrolled ? (
                <span className="pill pill-ok">✓ Inscrit(e)</span>
              ) : full ? (
                <span className="pill pill-danger">Complet</span>
              ) : (
                <button className="btn btn-primary sm" onClick={() => selfEnroll(student.id, c.id)}>S'inscrire</button>
              )}
            </div>
          );
        })}
        {classes.length === 0 && <p className="muted">Aucun cours disponible pour l'instant.</p>}
      </div>
    </div>
  );
}

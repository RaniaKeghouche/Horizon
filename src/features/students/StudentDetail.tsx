import { useState } from "react";
import Modal from "../../components/Modal";
import { useData } from "../../data/store";
import { computeStudentBilling } from "../../lib/billing";
import { defaultPrice } from "../../lib/payments";
import { formatDA } from "../../lib/format";
import { LEVEL_LABEL, SESSION_TYPE_LABEL, DAY_LABEL } from "../../lib/labels";
import type { Student } from "../../lib/types";

export default function StudentDetail({
  student,
  onClose,
}: {
  student: Student;
  onClose: () => void;
}) {
  const { subjects, teachers, classes, enrollments, sessions, payments } = useData();
  const enroll = useData((s) => s.enroll);
  const unenroll = useData((s) => s.unenroll);

  const billing = computeStudentBilling(student, enrollments, sessions, payments, {
    subjects,
    teachers,
  });

  // Classes the student is not yet enrolled in.
  const available = classes.filter(
    (c) => !enrollments.some((e) => e.studentId === student.id && e.classId === c.id)
  );

  const [classId, setClassId] = useState("");
  const [price, setPrice] = useState<number>(0);

  function onPickClass(id: string) {
    setClassId(id);
    const k = classes.find((c) => c.id === id);
    if (k) setPrice(defaultPrice(k.sessionType, k.level) ?? 0);
  }

  function doEnroll() {
    if (!classId || price <= 0) return;
    enroll(student.id, classId, price);
    setClassId("");
    setPrice(0);
  }

  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "—";

  return (
    <Modal title={student.name} onClose={onClose}>
      <div className="detail-head">
        <span className="badge">{LEVEL_LABEL[student.level]}</span>
        <span className="muted">📞 {student.phone}</span>
        <span className="muted">
          👪 {student.parentName} · {student.parentPhone}
        </span>
      </div>

      <h3 className="section-title">Facturation par matière</h3>
      {billing.subjects.length === 0 && <p className="muted">Aucune inscription pour l'instant.</p>}
      <div className="stack">
        {billing.subjects.map((s) => (
          <div key={s.enrollmentId} className="card billing-row">
            <div>
              <strong>{s.subjectName}</strong>
              <div className="muted small">
                {s.teacherName} · {formatDA(s.pricePerSession)}/séance
              </div>
              <div className="pill pill-soft">
                Séance {s.currentSession} sur {s.totalSessions}
              </div>
            </div>
            <div className="billing-amounts">
              {s.amountDue > 0 ? (
                <span className="pill pill-danger">Dû : {formatDA(s.amountDue)}</span>
              ) : (
                <span className="pill pill-ok">À jour</span>
              )}
              {s.reminderCount > 0 && (
                <span className="muted small">🔔 {s.reminderCount} rappel(s)</span>
              )}
              <button className="icon-btn danger" title="Désinscrire" onClick={() => unenroll(s.enrollmentId)}>
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="total-line">
        <span>Total dû</span>
        <strong className={billing.totalDue > 0 ? "text-danger" : "text-ok"}>
          {formatDA(billing.totalDue)}
        </strong>
      </div>

      <h3 className="section-title">Inscrire à une classe</h3>
      {available.length === 0 ? (
        <p className="muted">Inscrit à toutes les classes disponibles.</p>
      ) : (
        <div className="enroll-row">
          <select className="input" value={classId} onChange={(e) => onPickClass(e.target.value)}>
            <option value="">— Choisir une classe —</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {subjectName(c.subjectId)} · {SESSION_TYPE_LABEL[c.sessionType]} ·{" "}
                {DAY_LABEL[c.dayOfWeek]} {c.timeSlot}
                {c.isLocked ? " (complet)" : ""}
              </option>
            ))}
          </select>
          <input
            className="input price-input"
            type="number"
            value={price || ""}
            placeholder="Prix/séance"
            onChange={(e) => setPrice(Number(e.target.value))}
          />
          <button className="btn btn-primary" disabled={!classId || price <= 0} onClick={doEnroll}>
            Inscrire
          </button>
        </div>
      )}
    </Modal>
  );
}

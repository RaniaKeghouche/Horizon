import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../../components/Modal";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { computeStudentBilling } from "../../lib/billing";
import { defaultPrice } from "../../lib/payments";
import { formatDA } from "../../lib/format";
import { Phone, Users, Bell, X, Ticket } from "lucide-react";
import { LEVEL_LABEL } from "../../lib/labels";
import { useLabels } from "../../lib/useLabels";
import type { Student } from "../../lib/types";

export default function StudentDetail({
  student,
  onClose,
}: {
  student: Student;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const L = useLabels();
  const { subjects, teachers, classes, enrollments, sessions, payments } = useData();
  const { role } = useAuth();
  /** Inscrire, deplacer, desinscrire, gerer l'attente : actes d'administration.
   *  La base les refuse a un enseignant, l'interface ne doit donc pas les offrir. */
  const canManage = role === "admin";
  const adminAssign = useData((s) => s.adminAssign);
  const moveStudent = useData((s) => s.moveStudent);
  const unenroll = useData((s) => s.unenroll);
  const joinWaitlist = useData((s) => s.joinWaitlist);
  const leaveWaitlist = useData((s) => s.leaveWaitlist);

  const billing = computeStudentBilling(student, enrollments, sessions, payments, {
    subjects,
    teachers,
  });

  // Classes the student is not yet enrolled in, split by availability.
  const available = classes.filter(
    (c) => !enrollments.some((e) => e.studentId === student.id && e.classId === c.id)
  );
  const enrollable = available.filter((c) => c.currentStudents < c.maxStudents);
  const fullClasses = available.filter((c) => c.currentStudents >= c.maxStudents);

  const [classId, setClassId] = useState("");
  const [price, setPrice] = useState<number>(0);

  function onPickClass(id: string) {
    setClassId(id);
    const k = classes.find((c) => c.id === id);
    // Le prix du groupe d'abord : sans lui, choisir un cours particulier ou un
    // groupe special mettait le champ a 0 et desactivait le bouton d'inscription.
    if (k) setPrice(k.pricePerSession || defaultPrice(k.sessionType, k.level) || 0);
  }

  function doEnroll() {
    if (!classId || price <= 0) return;
    adminAssign(student.id, classId, price); // notifies the student
    setClassId("");
    setPrice(0);
  }

  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "—";

  return (
    <Modal title={student.name} onClose={onClose}>
      <div className="detail-head">
        <span className="badge">{LEVEL_LABEL[student.level]}</span>
        <a className="cell-phone" href={`tel:${student.phone}`}>
          <Phone size={13} /> {student.phone}
        </a>
        <span className="cell-phone">
          <Users size={13} /> {student.parentName} · {student.parentPhone}
        </span>
      </div>

      <h3 className="section-title">{t("sd.billing")}</h3>
      {billing.subjects.length === 0 && <p className="muted">{t("pmt.no_enrolment")}</p>}
      <div className="stack">
        {billing.subjects.map((s) => (
          <div key={s.enrollmentId} className="card billing-row">
            <div>
              <strong>{s.subjectName}</strong>
              <div className="muted small">
                {s.teacherName} · {t("sd.per_session", { amount: formatDA(s.pricePerSession) })}
              </div>
              <div className="pill pill-soft">
                {t("sd.session_of", { n: s.currentSession, total: s.totalSessions })}
              </div>
            </div>
            <div className="billing-amounts">
              {s.amountDue > 0 ? (
                <span className="pill pill-danger">{t("pmt.due")} : {formatDA(s.amountDue)}</span>
              ) : (
                <span className="pill pill-ok">{t("stu.up_to_date")}</span>
              )}
              {s.reminderCount > 0 && (
                <span className="muted small"><Bell size={12} /> {t("pmt.reminders", { n: s.reminderCount })}</span>
              )}
              {canManage && (
                <>
                  <select
                    className="input move-select"
                    value=""
                    title={t("sd.change_group")}
                    onChange={(e) => e.target.value && moveStudent(s.enrollmentId, e.target.value)}
                  >
                    <option value="">{t("sd.change_group")}</option>
                    {enrollable.map((c) => (
                      <option key={c.id} value={c.id}>
                        {subjectName(c.subjectId)} · {t(`days.${c.dayOfWeek}`)} {c.timeSlot}
                      </option>
                    ))}
                  </select>
                  <button className="icon-btn danger" title={t("sd.unenrol")} onClick={() => unenroll(s.enrollmentId)}>
                    <X size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="total-line">
        <span>{t("payments.totalDue")}</span>
        <strong className={billing.totalDue > 0 ? "text-danger" : "text-ok"}>
          {formatDA(billing.totalDue)}
        </strong>
      </div>

      {/* Inscrire dans un groupe est un acte d'administration : la base le
          refuse a un enseignant, on ne montre donc pas le formulaire. */}
      {canManage && (
      <>
      <h3 className="section-title">{t("sd.enrol_in")}</h3>
      {enrollable.length === 0 ? (
        <p className="muted">{t("sd.no_class")}</p>
      ) : (
        <div className="enroll-row">
          <select className="input" value={classId} onChange={(e) => onPickClass(e.target.value)}>
            <option value="">{t("sd.pick_class")}</option>
            {enrollable.map((c) => (
              <option key={c.id} value={c.id}>
                {subjectName(c.subjectId)} · {L.sessionType(c.sessionType)} ·{" "}
                {t(`days.${c.dayOfWeek}`)} {c.timeSlot} ({c.currentStudents}/{c.maxStudents})
              </option>
            ))}
          </select>
          <input
            className="input price-input"
            type="number"
            value={price || ""}
            placeholder={t("sd.price_placeholder")}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
          <button className="btn btn-primary" disabled={!classId || price <= 0} onClick={doEnroll}>
            {t("sd.enrol_btn")}
          </button>
        </div>
      )}
      </>
      )}

      {fullClasses.length > 0 && (
        <>
          <h3 className="section-title">{t("sd.waitlist")}</h3>
          <div className="stack">
            {fullClasses.map((c) => {
              const list = c.waitingList ?? [];
              const pos = list.indexOf(student.id);
              return (
                <div key={c.id} className="billing-row">
                  <div>
                    <strong>{subjectName(c.subjectId)}</strong>
                    <div className="muted small">
                      {t(`days.${c.dayOfWeek}`)} {c.timeSlot} · complet ({c.maxStudents}/{c.maxStudents})
                    </div>
                    {pos >= 0 && <span className="pill pill-warn">En attente · position {pos + 1}</span>}
                  </div>
                  {canManage &&
                    (pos >= 0 ? (
                      <button className="btn btn-ghost sm" onClick={() => leaveWaitlist(c.id, student.id)}>{t("sd.leave")}</button>
                    ) : (
                      <button className="btn btn-primary sm" onClick={() => joinWaitlist(c.id, student.id)}>
                        <Ticket size={14} /> {t("sd.join_waitlist")}
                      </button>
                    ))}
                </div>
              );
            })}
          </div>
        </>
      )}
    </Modal>
  );
}

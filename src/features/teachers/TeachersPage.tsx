import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useData } from "../../data/store";
import { teacherPayout } from "../../lib/billing";
import { formatDA } from "../../lib/format";
import { PAYMENT_MODE_LABEL } from "../../lib/labels";
import TeacherForm, { type TeacherFormValues } from "./TeacherForm";
import type { Teacher } from "../../lib/types";

export default function TeachersPage() {
  const { t } = useTranslation();
  const { teachers, subjects, enrollments, payments } = useData();
  const addTeacher = useData((s) => s.addTeacher);
  const updateTeacher = useData((s) => s.updateTeacher);
  const deleteTeacher = useData((s) => s.deleteTeacher);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);

  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "?";

  function onSave(values: TeacherFormValues) {
    if (editing) updateTeacher(editing.id, values);
    else addTeacher(values);
    setShowForm(false);
    setEditing(null);
  }

  return (
    <div className="stack">
      <div className="page-head">
        <h1>{t("nav.teachers")}</h1>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          ＋ Nouvel enseignant
        </button>
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Matières</th>
              <th>Mode</th>
              <th>Part école</th>
              <th>Encaissé (part prof)</th>
              <th>En attente</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((teacher) => {
              const payout = teacherPayout(teacher.id, enrollments, payments);
              return (
                <tr key={teacher.id}>
                  <td><strong>{teacher.name}</strong><div className="muted small">📞 {teacher.phone}</div></td>
                  <td>{teacher.subjects.map(subjName).join(", ") || "—"}</td>
                  <td>{PAYMENT_MODE_LABEL[teacher.paymentMode]}</td>
                  <td>{teacher.paymentMode === "percentage" ? `${teacher.schoolCutValue} %` : formatDA(teacher.schoolCutValue)}</td>
                  <td className="text-ok">{formatDA(payout.earned)}</td>
                  <td>{payout.pending > 0 ? <span className="text-danger">{formatDA(payout.pending)}</span> : "—"}</td>
                  <td className="row-actions">
                    <button className="icon-btn" title={t("common.edit")} onClick={() => { setEditing(teacher); setShowForm(true); }}>✏️</button>
                    <button className="icon-btn danger" title={t("common.delete")} onClick={() => confirm(`Supprimer ${teacher.name} ?`) && deleteTeacher(teacher.id)}>🗑</button>
                  </td>
                </tr>
              );
            })}
            {teachers.length === 0 && (
              <tr><td colSpan={7} className="muted center">Aucun enseignant.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <TeacherForm
          initial={editing ?? undefined}
          onSave={onSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

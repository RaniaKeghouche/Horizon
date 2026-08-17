import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Phone, Users } from "lucide-react";
import { useData } from "../../data/store";
import { teacherPayout } from "../../lib/billing";
import { formatDA } from "../../lib/format";
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
      <header className="page-head">
        <div className="page-title">
          <h1>{t("nav.teachers")}</h1>
          <p>{t("tea.count", { n: teachers.length })}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={17} /> {t("tea.new")}
        </button>
      </header>

      {teachers.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon"><Users size={24} /></span>
            <strong>{t("tea.none")}</strong>
            <p>{t("tea.none_hint")}</p>
          </div>
        </div>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t("stu.name")}</th>
                <th>{t("nav.subjects")}</th>
                <th>{t("tea.pay_rule")}</th>
                <th>{t("tea.collected")}</th>
                <th>{t("tea.pending")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher) => {
                const payout = teacherPayout(teacher.id, enrollments, payments);
                return (
                  <tr key={teacher.id}>
                    <td>
                      <div className="cell-id">
                        <span className="cell-avatar">{initials(teacher.name)}</span>
                        <div>
                          <strong>{teacher.name}</strong>
                          <a className="muted small cell-phone" href={`tel:${teacher.phone}`}>
                            <Phone size={12} /> {teacher.phone}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="cell-tags">
                        {teacher.subjects.length === 0
                          ? "—"
                          : teacher.subjects.map((id) => (
                              <span key={id} className="pill pill-soft">{subjName(id)}</span>
                            ))}
                      </div>
                    </td>
                    <td>
                      {teacher.paymentMode === "percentage"
                        ? t("tea.rule_percent", { pct: 100 - teacher.schoolCutValue })
                        : t("tea.rule_fixed", { amount: formatDA(teacher.schoolCutValue) })}
                    </td>
                    <td className="text-ok">{formatDA(payout.earned)}</td>
                    <td>{payout.pending > 0 ? <span className="text-danger">{formatDA(payout.pending)}</span> : "—"}</td>
                    <td className="row-actions">
                      <button className="icon-btn" title={t("common.edit")} onClick={() => { setEditing(teacher); setShowForm(true); }}>
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-btn danger"
                        title={t("common.delete")}
                        onClick={() => confirm(t("stu.confirm_delete", { name: teacher.name })) && deleteTeacher(teacher.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

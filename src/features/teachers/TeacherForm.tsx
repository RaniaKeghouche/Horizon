import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../../components/Modal";
import { useData } from "../../data/store";
import { useLabels } from "../../lib/useLabels";
import { computeCut } from "../../lib/payments";
import { formatDA } from "../../lib/format";
import type { PaymentMode, Teacher } from "../../lib/types";

export interface TeacherFormValues {
  name: string;
  phone: string;
  subjects: string[];
  paymentMode: PaymentMode;
  schoolCutValue: number;
}

export default function TeacherForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Teacher;
  onSave: (values: TeacherFormValues) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const L = useLabels();
  const allSubjects = useData((s) => s.subjects);
  const addSubject = useData((s) => s.addSubject);
  const [newSubject, setNewSubject] = useState("");
  const [v, setV] = useState<TeacherFormValues>({
    name: initial?.name ?? "",
    phone: initial?.phone ?? "",
    subjects: initial?.subjects ?? [],
    paymentMode: initial?.paymentMode ?? "percentage",
    schoolCutValue: initial?.schoolCutValue ?? 25,
  });

  const set = <K extends keyof TeacherFormValues>(k: K, val: TeacherFormValues[K]) =>
    setV((prev) => ({ ...prev, [k]: val }));

  function toggleSubject(id: string) {
    set("subjects", v.subjects.includes(id) ? v.subjects.filter((x) => x !== id) : [...v.subjects, id]);
  }

  // Add a brand-new subject on the fly and auto-select it for this teacher.
  function quickAddSubject() {
    const name = newSubject.trim();
    if (!name) return;
    const s = addSubject(name);
    set("subjects", [...v.subjects, s.id]);
    setNewSubject("");
  }

  // Live preview of the split on a 10 000 DA example (cahier §3.2).
  const preview = computeCut(10000, v.paymentMode, v.schoolCutValue);

  return (
    <Modal
      title={initial ? t("frm.edit_teacher") : t("tea.new")}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>{t("common.cancel")}</button>
          <button
            className="btn btn-primary"
            disabled={!v.name.trim()}
            onClick={() => onSave({ ...v, name: v.name.trim() })}
          >
            {t("common.save")}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <label className="field">
          <span>{t("frm.full_name")} *</span>
          <input className="input" value={v.name} onChange={(e) => set("name", e.target.value)} />
        </label>
        <label className="field">
          <span>{t("auth.phone")}</span>
          <input className="input" value={v.phone} onChange={(e) => set("phone", e.target.value)} />
        </label>
      </div>

      <div className="field">
        <span>{t("frm.subjects_taught")}</span>
        <div className="checkbox-list">
          {allSubjects.map((s) => (
            <label key={s.id} className={"chip-toggle" + (v.subjects.includes(s.id) ? " on" : "")}>
              <input
                type="checkbox"
                checked={v.subjects.includes(s.id)}
                onChange={() => toggleSubject(s.id)}
              />
              {s.name}
            </label>
          ))}
        </div>
        <div className="add-row" style={{ marginTop: "0.5rem" }}>
          <input
            className="input"
            placeholder={t("sub.placeholder")}
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), quickAddSubject())}
          />
          <button type="button" className="btn btn-ghost" onClick={quickAddSubject}>{t("common.add")}</button>
        </div>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>{t("frm.pay_mode")}</span>
          <select
            className="input"
            value={v.paymentMode}
            onChange={(e) => {
              const m = e.target.value as PaymentMode;
              // Reset to a sensible default when switching mode.
              setV((prev) => ({ ...prev, paymentMode: m, schoolCutValue: m === "percentage" ? 25 : 500 }));
            }}
          >
            {(["percentage", "fixed"] as PaymentMode[]).map((m) => (
              <option key={m} value={m}>{L.paymentMode(m)}</option>
            ))}
          </select>
        </label>
        {v.paymentMode === "percentage" ? (
          <label className="field">
            <span>{t("frm.pct_teacher")}</span>
            <input
              className="input"
              type="number"
              min={0}
              max={100}
              value={100 - v.schoolCutValue}
              onChange={(e) => set("schoolCutValue", Math.min(100, Math.max(0, 100 - Number(e.target.value))))}
            />
            <span className="muted small">{t("frm.school_keeps", { pct: v.schoolCutValue })}</span>
          </label>
        ) : (
          <label className="field">
            <span>{t("frm.fixed_school")}</span>
            <input
              className="input"
              type="number"
              value={v.schoolCutValue}
              onChange={(e) => set("schoolCutValue", Number(e.target.value))}
            />
            <span className="muted small">{t("frm.teacher_keeps")}</span>
          </label>
        )}
      </div>

      <div className="preview-box">
        {t("tf.cut_example")}
        <strong> enseignant {formatDA(preview.teacherCut)}</strong> ·
        <strong> école {formatDA(preview.schoolCut)}</strong>
      </div>
    </Modal>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../../components/Modal";
import { LEVEL_LABEL, STATUSES } from "../../lib/labels";
import { useLabels } from "../../lib/useLabels";
import type { Student, StudentLevel, StudentStatus } from "../../lib/types";

export interface StudentFormValues {
  name: string;
  level: StudentLevel;
  phone: string;
  parentName: string;
  parentPhone: string;
  status: StudentStatus;
}

export default function StudentForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Student;
  onSave: (values: StudentFormValues) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const L = useLabels();
  const [v, setV] = useState<StudentFormValues>({
    name: initial?.name ?? "",
    level: initial?.level ?? "1as",
    phone: initial?.phone ?? "",
    parentName: initial?.parentName ?? "",
    parentPhone: initial?.parentPhone ?? "",
    status: initial?.status ?? "active",
  });

  const set = <K extends keyof StudentFormValues>(k: K, val: StudentFormValues[K]) =>
    setV((prev) => ({ ...prev, [k]: val }));

  const valid = v.name.trim() && v.phone.trim() && v.parentPhone.trim();

  return (
    <Modal
      title={initial ? t("frm.edit_student") : t("stu.new")}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            className="btn btn-primary"
            disabled={!valid}
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
          <span>{t("stu.level")}</span>
          <select className="input" value={v.level} onChange={(e) => set("level", e.target.value as StudentLevel)}>
            {L.levelGroups().map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.levels.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="field">
          <span>{t("frm.student_phone")} *</span>
          <input className="input" value={v.phone} onChange={(e) => set("phone", e.target.value)} />
        </label>

        <label className="field">
          <span>{t("stu.status")}</span>
          <select className="input" value={v.status} onChange={(e) => set("status", e.target.value as StudentStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>{t("frm.parent_name")}</span>
          <input className="input" value={v.parentName} onChange={(e) => set("parentName", e.target.value)} />
        </label>

        <label className="field">
          <span>{t("frm.parent_phone")} *</span>
          <input className="input" value={v.parentPhone} onChange={(e) => set("parentPhone", e.target.value)} />
        </label>
      </div>
    </Modal>
  );
}

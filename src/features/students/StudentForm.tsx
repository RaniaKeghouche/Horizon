import { useState } from "react";
import Modal from "../../components/Modal";
import { LEVELS, LEVEL_LABEL, STATUSES, STATUS_LABEL } from "../../lib/labels";
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
  const [v, setV] = useState<StudentFormValues>({
    name: initial?.name ?? "",
    level: initial?.level ?? "high",
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
      title={initial ? "Modifier l'étudiant" : "Nouvel étudiant"}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button
            className="btn btn-primary"
            disabled={!valid}
            onClick={() => onSave({ ...v, name: v.name.trim() })}
          >
            Enregistrer
          </button>
        </>
      }
    >
      <div className="form-grid">
        <label className="field">
          <span>Nom complet *</span>
          <input className="input" value={v.name} onChange={(e) => set("name", e.target.value)} />
        </label>

        <label className="field">
          <span>Niveau</span>
          <select className="input" value={v.level} onChange={(e) => set("level", e.target.value as StudentLevel)}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABEL[l]}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Téléphone étudiant *</span>
          <input className="input" value={v.phone} onChange={(e) => set("phone", e.target.value)} />
        </label>

        <label className="field">
          <span>Statut</span>
          <select className="input" value={v.status} onChange={(e) => set("status", e.target.value as StudentStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Nom du parent</span>
          <input className="input" value={v.parentName} onChange={(e) => set("parentName", e.target.value)} />
        </label>

        <label className="field">
          <span>Téléphone parent *</span>
          <input className="input" value={v.parentPhone} onChange={(e) => set("parentPhone", e.target.value)} />
        </label>
      </div>
    </Modal>
  );
}

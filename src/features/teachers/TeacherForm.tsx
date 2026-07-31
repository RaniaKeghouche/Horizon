import { useState } from "react";
import Modal from "../../components/Modal";
import { useData } from "../../data/store";
import { PAYMENT_MODE_LABEL } from "../../lib/labels";
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
      title={initial ? "Modifier l'enseignant" : "Nouvel enseignant"}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button
            className="btn btn-primary"
            disabled={!v.name.trim()}
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
          <span>Téléphone</span>
          <input className="input" value={v.phone} onChange={(e) => set("phone", e.target.value)} />
        </label>
      </div>

      <div className="field">
        <span>Matières enseignées</span>
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
            placeholder="Nouvelle matière (ex : Espagnol)"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), quickAddSubject())}
          />
          <button type="button" className="btn btn-ghost" onClick={quickAddSubject}>＋ Ajouter</button>
        </div>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Mode de part de l'école</span>
          <select className="input" value={v.paymentMode} onChange={(e) => set("paymentMode", e.target.value as PaymentMode)}>
            {(["percentage", "fixed"] as PaymentMode[]).map((m) => (
              <option key={m} value={m}>{PAYMENT_MODE_LABEL[m]}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{v.paymentMode === "percentage" ? "Pourcentage école (%)" : "Montant fixe école (DA)"}</span>
          <input
            className="input"
            type="number"
            value={v.schoolCutValue}
            onChange={(e) => set("schoolCutValue", Number(e.target.value))}
          />
        </label>
      </div>

      <div className="preview-box">
        Exemple sur une séance à 10 000 DA :
        <strong> école {formatDA(preview.schoolCut)}</strong> ·
        <strong> enseignant {formatDA(preview.teacherCut)}</strong>
      </div>
    </Modal>
  );
}

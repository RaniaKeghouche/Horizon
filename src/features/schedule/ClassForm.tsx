import { useState } from "react";
import Modal from "../../components/Modal";
import { useData } from "../../data/store";
import { checkSlot, DAYS, TIME_SLOTS } from "../../lib/schedule";
import { defaultPrice } from "../../lib/payments";
import { LEVELS, LEVEL_LABEL, SESSION_TYPES, SESSION_TYPE_LABEL, DAY_LABEL } from "../../lib/labels";
import type { ClassRoom, DayOfWeek, SessionType, StudentLevel } from "../../lib/types";

export default function ClassForm({
  initial,
  prefill,
  defaults,
  onClose,
  onDelete,
  onDuplicate,
}: {
  initial?: ClassRoom;
  prefill?: Partial<ClassRoom>;
  defaults?: { dayOfWeek: DayOfWeek; timeSlot: string; teacherId?: string };
  onClose: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}) {
  const { subjects, teachers, classes } = useData();
  const addClass = useData((s) => s.addClass);
  const updateClass = useData((s) => s.updateClass);

  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? prefill?.subjectId ?? subjects[0]?.id ?? "");
  const [teacherId, setTeacherId] = useState(initial?.teacherId ?? prefill?.teacherId ?? defaults?.teacherId ?? teachers[0]?.id ?? "");
  const [level, setLevel] = useState<StudentLevel>(initial?.level ?? prefill?.level ?? "high");
  const [sessionType, setSessionType] = useState<SessionType>(initial?.sessionType ?? prefill?.sessionType ?? "group");
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(initial?.dayOfWeek ?? defaults?.dayOfWeek ?? "monday");
  const [timeSlot, setTimeSlot] = useState(initial?.timeSlot ?? defaults?.timeSlot ?? TIME_SLOTS[0]);
  const [maxStudents, setMaxStudents] = useState(initial?.maxStudents ?? prefill?.maxStudents ?? 15);
  const [error, setError] = useState("");

  function save() {
    // Two-part free-slot check (§5.2), excluding this class when editing.
    const check = checkSlot(classes, dayOfWeek, timeSlot, teacherId, initial?.id);
    if (!check.ok) {
      setError(
        check.reason === "slot_taken"
          ? "Ce créneau est déjà occupé par une autre classe."
          : "Cet enseignant a déjà une classe à ce créneau."
      );
      return;
    }
    if (initial) {
      updateClass(initial.id, { subjectId, teacherId, level, sessionType, dayOfWeek, timeSlot, maxStudents });
    } else {
      addClass({ subjectId, teacherId, level, sessionType, dayOfWeek, timeSlot, maxStudents });
    }
    onClose();
  }

  const price = defaultPrice(sessionType, level);

  return (
    <Modal
      title={initial ? "Modifier la classe" : "Nouvelle classe"}
      onClose={onClose}
      footer={
        <>
          {(onDelete || onDuplicate) && (
            <div className="foot-left">
              {onDelete && <button className="btn btn-danger" onClick={onDelete}>🗑 Supprimer</button>}
              {onDuplicate && <button className="btn btn-ghost" onClick={onDuplicate}>⧉ Dupliquer</button>}
            </div>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={save} disabled={!subjectId || !teacherId}>
            Enregistrer
          </button>
        </>
      }
    >
      <div className="form-grid">
        <label className="field">
          <span>Matière</span>
          <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Enseignant</span>
          <select className="input" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Niveau</span>
          <select className="input" value={level} onChange={(e) => setLevel(e.target.value as StudentLevel)}>
            {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Type de séance</span>
          <select className="input" value={sessionType} onChange={(e) => setSessionType(e.target.value as SessionType)}>
            {SESSION_TYPES.map((s) => <option key={s} value={s}>{SESSION_TYPE_LABEL[s]}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Jour</span>
          <select className="input" value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}>
            {DAYS.map((d) => <option key={d} value={d}>{DAY_LABEL[d]}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Créneau</span>
          <select className="input" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
            {TIME_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Capacité max (4–20)</span>
          <input className="input" type="number" min={4} max={20} value={maxStudents}
            onChange={(e) => setMaxStudents(Number(e.target.value))} />
        </label>
      </div>

      {price != null && (
        <div className="preview-box">Prix par défaut pour ce type/niveau : {price} DA/séance</div>
      )}
      {error && <p className="error-text">{error}</p>}
    </Modal>
  );
}

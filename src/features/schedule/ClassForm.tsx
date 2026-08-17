import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, Copy } from "lucide-react";
import Modal from "../../components/Modal";
import { useData } from "../../data/store";
import { checkSlot, DAYS } from "../../lib/schedule";
import { defaultPrice } from "../../lib/payments";
import { LEVEL_LABEL, LEVEL_GROUPS, SESSION_TYPES, SESSION_TYPE_LABEL, DAY_LABEL } from "../../lib/labels";
import type { ClassRoom, DayOfWeek, SessionType, StudentLevel } from "../../lib/types";

function splitSlot(s: string): { start: string; end: string } {
  const [a, b] = s.split("-");
  return { start: a ?? "08:00", end: b ?? "10:00" };
}
function addHours(t: string, h: number): string {
  const [hh, mm] = t.split(":").map(Number);
  const total = (hh * 60 + mm + h * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

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
  const { t } = useTranslation();
  const { subjects, teachers, classes } = useData();
  const addClass = useData((s) => s.addClass);
  const updateClass = useData((s) => s.updateClass);

  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? prefill?.subjectId ?? subjects[0]?.id ?? "");
  const [teacherId, setTeacherId] = useState(initial?.teacherId ?? prefill?.teacherId ?? defaults?.teacherId ?? teachers[0]?.id ?? "");
  const [level, setLevel] = useState<StudentLevel>(initial?.level ?? prefill?.level ?? "1as");
  const [sessionType, setSessionType] = useState<SessionType>(initial?.sessionType ?? prefill?.sessionType ?? "group");
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(initial?.dayOfWeek ?? defaults?.dayOfWeek ?? "monday");
  const initSlot = splitSlot(initial?.timeSlot ?? defaults?.timeSlot ?? "08:00-10:00");
  const [start, setStart] = useState(initSlot.start);
  const [end, setEnd] = useState(initSlot.end);
  const timeSlot = `${start}-${end}`;
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
              {onDelete && (
                <button className="btn btn-danger" onClick={onDelete}>
                  <Trash2 size={16} /> {t("common.delete")}
                </button>
              )}
              {onDuplicate && (
                <button className="btn btn-ghost" onClick={onDuplicate}>
                  <Copy size={16} /> {t("cf.duplicate")}
                </button>
              )}
            </div>
          )}
          <button className="btn btn-ghost" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn btn-primary" onClick={save} disabled={!subjectId || !teacherId}>
            {t("common.save")}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <label className="field">
          <span>{t("cf.subject")}</span>
          <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>{t("roles.teacher")}</span>
          <select className="input" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>{t("stu.level")}</span>
          <select className="input" value={level} onChange={(e) => setLevel(e.target.value as StudentLevel)}>
            {LEVEL_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.levels.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t("cf.session_type")}</span>
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
          <span>Début</span>
          <input
            type="time"
            className="input"
            value={start}
            onChange={(e) => { setStart(e.target.value); setEnd(addHours(e.target.value, 2)); }}
          />
        </label>
        <label className="field">
          <span>{t("cf.end_time")}</span>
          <input type="time" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <label className="field">
          <span>{t("cf.capacity")}</span>
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

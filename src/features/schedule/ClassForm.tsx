import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, Copy } from "lucide-react";
import Modal from "../../components/Modal";
import { useData } from "../../data/store";
import { checkSlot, freeRoomsAt, DAYS, SESSION_HOURS, TIME_SLOTS } from "../../lib/schedule";
import { roomsOrDefault } from "../../lib/rooms";
import { defaultPrice, computeCut } from "../../lib/payments";
import { formatDA } from "../../lib/format";
import { LEVEL_LABEL, SESSION_TYPES } from "../../lib/labels";
import { useLabels } from "../../lib/useLabels";
import type { ClassRoom, DayOfWeek, PaymentMode, SessionType, StudentLevel } from "../../lib/types";

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
  onCreated,
}: {
  initial?: ClassRoom;
  prefill?: Partial<ClassRoom>;
  defaults?: { dayOfWeek: DayOfWeek; timeSlot: string; teacherId?: string };
  onClose: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  /** Appele UNIQUEMENT apres un enregistrement reussi. Permet a l'appelant de
   *  n'acter une demande de creneau qu'une fois le groupe reellement cree :
   *  fermer sans enregistrer ne doit rien approuver. */
  onCreated?: (klass: ClassRoom) => void;
}) {
  const { t } = useTranslation();
  const L = useLabels();
  const { subjects, teachers, classes, rooms: dbRooms } = useData();
  // The five physical rooms always exist, whether or not the table does.
  const rooms = roomsOrDefault(dbRooms);
  const addClass = useData((s) => s.addClass);
  const updateClass = useData((s) => s.updateClass);

  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? prefill?.subjectId ?? subjects[0]?.id ?? "");
  const [teacherId, setTeacherId] = useState(initial?.teacherId ?? prefill?.teacherId ?? defaults?.teacherId ?? teachers[0]?.id ?? "");
  const [level, setLevel] = useState<StudentLevel>(initial?.level ?? prefill?.level ?? "1as");
  const [sessionType, setSessionType] = useState<SessionType>(initial?.sessionType ?? prefill?.sessionType ?? "group");
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(initial?.dayOfWeek ?? defaults?.dayOfWeek ?? "monday");
  const initSlot = splitSlot(initial?.timeSlot ?? defaults?.timeSlot ?? TIME_SLOTS[0]);
  const [start, setStart] = useState(initSlot.start);
  const [end, setEnd] = useState(initSlot.end);
  const timeSlot = `${start}-${end}`;
  const [maxStudents, setMaxStudents] = useState(initial?.maxStudents ?? prefill?.maxStudents ?? 15);
  const [error, setError] = useState("");

  // Champs introduits avec les salles physiques : un créneau n'est occupé que
  // PAR SALLE, et le tarif comme la part école se fixent désormais sur le groupe
  // (ils y font autorité sur la fiche enseignant).
  const [roomId, setRoomId] = useState(initial?.roomId ?? prefill?.roomId ?? rooms[0]?.id ?? "");
  const [pricePerSession, setPricePerSession] = useState(
    initial?.pricePerSession ?? prefill?.pricePerSession ?? defaultPrice(sessionType, level) ?? 2000
  );
  const teacher = teachers.find((x) => x.id === teacherId);
  const [schoolCutMode, setSchoolCutMode] = useState<PaymentMode>(
    initial?.schoolCutMode ?? teacher?.paymentMode ?? "percentage"
  );
  const [schoolCutValue, setSchoolCutValue] = useState(
    initial?.schoolCutValue ?? teacher?.schoolCutValue ?? 25
  );

  // A slot is only taken PER ROOM: the same day and time can host several
  // classes as long as they sit in different rooms. Show that in the picker
  // instead of letting the user find out on save.
  const freeIds = freeRoomsAt(classes, rooms.map((r) => r.id), dayOfWeek, timeSlot, initial?.id);
  const occupantOf = (rid: string) =>
    classes.find(
      (c) => c.id !== initial?.id && c.roomId === rid && c.dayOfWeek === dayOfWeek && c.timeSlot === timeSlot
    );

  function save() {
    // Vérification du créneau libre (§5.2). L'ordre des arguments compte : la
    // salle vient AVANT la classe à exclure, sinon on exclut la mauvaise.
    const check = checkSlot(classes, dayOfWeek, timeSlot, teacherId, roomId, initial?.id);
    if (!check.ok) {
      // checkSlot reports "room_taken", never "slot_taken" — comparing against
      // the wrong string showed "this teacher is busy" whenever the real
      // problem was the room already being used at that time.
      setError(check.reason === "room_taken" ? t("cf.slot_taken") : t("cf.teacher_busy"));
      return;
    }
    const values = {
      subjectId, teacherId, roomId, level, sessionType, dayOfWeek, timeSlot,
      maxStudents, pricePerSession, schoolCutMode, schoolCutValue,
    };
    if (initial) {
      updateClass(initial.id, values);
      onClose();
      return;
    }
    const created = addClass(values);
    if (onCreated) onCreated(created);
    else onClose();
  }

  const price = pricePerSession;

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
            {L.levelGroups().map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.levels.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t("cf.session_type")}</span>
          <select className="input" value={sessionType} onChange={(e) => setSessionType(e.target.value as SessionType)}>
            {SESSION_TYPES.map((s) => <option key={s} value={s}>{L.sessionType(s)}</option>)}
          </select>
        </label>
        <label className="field">
          <span>{t("cf.room")}</span>
          <select className="input" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            {rooms.map((r) => {
              const busy = !freeIds.includes(r.id);
              const occ = busy ? occupantOf(r.id) : undefined;
              return (
                <option key={r.id} value={r.id} disabled={busy}>
                  {r.name} ({r.capacity}
                  {r.capacity > 1 ? " places" : " place"})
                  {busy ? ` — occupée${occ ? " : " + (subjects.find((x) => x.id === occ.subjectId)?.name ?? "") : ""}` : ""}
                </option>
              );
            })}
          </select>
          <span className="muted small">
            {freeIds.length} salle(s) libre(s) {t("sch.day").toLowerCase()} {t(`days.${dayOfWeek}`)} {timeSlot}
          </span>
        </label>
        <label className="field">
          <span>{t("sch.day")}</span>
          <select className="input" value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}>
            {DAYS.map((d) => <option key={d} value={d}>{t(`days.${d}`)}</option>)}
          </select>
        </label>
        <label className="field">
          <span>{t("cf.start")}</span>
          <input
            type="time"
            className="input"
            value={start}
            onChange={(e) => { setStart(e.target.value); setEnd(addHours(e.target.value, SESSION_HOURS)); }}
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
        <label className="field">
          <span>{t("cf.price")}</span>
          <input className="input" type="number" min={0} step={100} value={pricePerSession}
            onChange={(e) => setPricePerSession(Number(e.target.value))} />
        </label>
        <label className="field">
          <span>{t("frm.pay_mode")}</span>
          <select
            className="input"
            value={schoolCutMode}
            onChange={(e) => {
              const m = e.target.value as PaymentMode;
              setSchoolCutMode(m);
              setSchoolCutValue(m === "percentage" ? 25 : 500);
            }}
          >
            {(["percentage", "fixed"] as PaymentMode[]).map((m) => (
              <option key={m} value={m}>{L.paymentMode(m)}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{schoolCutMode === "percentage" ? t("cf.cut_pct") : t("cf.cut_fixed")}</span>
          <input className="input" type="number" min={0} value={schoolCutValue}
            onChange={(e) => setSchoolCutValue(Number(e.target.value))} />
        </label>
      </div>

      {/* Le tarif et la part école se fixent sur le GROUPE et font autorité sur
          la fiche enseignant : on montre donc le partage résultant. */}
      <div className="preview-box">
        {t("cf.split_preview", {
          price: formatDA(price),
          school: formatDA(computeCut(price, schoolCutMode, schoolCutValue).schoolCut),
          teacher: formatDA(computeCut(price, schoolCutMode, schoolCutValue).teacherCut),
        })}
      </div>
      {error && <p className="error-text">{error}</p>}
    </Modal>
  );
}

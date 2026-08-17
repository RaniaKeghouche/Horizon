import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, Clock, Lock, CircleCheck } from "lucide-react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { DAYS, TIME_SLOTS, checkSlot } from "../../lib/schedule";
import Modal from "../../components/Modal";
import ClassForm from "./ClassForm";
import type { ClassRoom, DayOfWeek } from "../../lib/types";

// Free-slot weekly builder (Cahier des Charges §5.2), wired to the store.
export default function SchedulePage() {
  const { t } = useTranslation();
  const { role, profile } = useAuth();
  const { classes, teachers, subjects, rooms } = useData();
  const deleteClass = useData((s) => s.deleteClass);
  const addSlotRequest = useData((s) => s.addSlotRequest);

  const isAdmin = role === "admin";
  // Teacher whose free slots are highlighted (admin picks; teacher is locked to self).
  const [teacherId, setTeacherId] = useState(
    role === "teacher" ? profile?.teacherId ?? teachers[0]?.id ?? "" : teachers[0]?.id ?? ""
  );

  // The grid shows one room at a time — a slot is only busy for the room it is in.
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");

  const [adding, setAdding] = useState<{ dayOfWeek: DayOfWeek; timeSlot: string } | null>(null);
  const [editing, setEditing] = useState<ClassRoom | null>(null);
  const [duplicating, setDuplicating] = useState<Partial<ClassRoom> | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [reqDay, setReqDay] = useState<DayOfWeek>("monday");
  const [reqSlot, setReqSlot] = useState(TIME_SLOTS[0]);
  const [reqSubject, setReqSubject] = useState("");

  const [flash, setFlash] = useState("");
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(""), 4000);
    return () => clearTimeout(id);
  }, [flash]);

  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "?";
  const teacherName = (id: string) => teachers.find((x) => x.id === id)?.name ?? "?";

  // The grid shows one room at a time — a slot is only busy for its own room.
  const inRoom = classes.filter((c) => !roomId || c.roomId === roomId);
  // For teachers, show only their own classes on the grid.
  const visibleClasses = role === "teacher"
    ? inRoom.filter((c) => c.teacherId === teacherId)
    : inRoom;

  const grid = useMemo(() => {
    const map = new Map<string, ClassRoom>();
    for (const c of visibleClasses) map.set(`${c.dayOfWeek}|${c.timeSlot}`, c);
    return map;
  }, [visibleClasses]);

  return (
    <div className="stack">
      <header className="page-head">
        <div className="page-title">
          <h1>{t("nav.schedule")}</h1>
          <p>{t("sch.subtitle")}</p>
        </div>
        {isAdmin && (
          <div className="teacher-pick">
            <span className="muted small">{t("sch.free_for")}</span>
            <select className="input" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              {teachers.map((tc) => <option key={tc.id} value={tc.id}>{tc.name}</option>)}
            </select>
          </div>
        )}
        {/* One room at a time: the centre runs several classes in parallel, so a
            slot is only occupied for the room it belongs to. */}
        <div className="teacher-pick">
          <span className="muted small">Salle :</span>
          <select className="input" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.capacity})
              </option>
            ))}
          </select>
        </div>
        {role === "teacher" && (
          <button className="btn btn-primary" onClick={() => setRequesting(true)}>
            <CalendarClock size={17} /> {t("sch.request_slot")}
          </button>
        )}
      </header>

      {flash && <p className="att-flash"><CircleCheck size={16} /> {flash}</p>}

      {isAdmin && (
        <p className="sch-legend">
          <span className="sch-swatch" aria-hidden="true" />
          {t("sch.legend", { name: teacherName(teacherId) })}
        </p>
      )}

      <div className="schedule-wrap">
        <table className="schedule-grid">
          <thead>
            <tr>
              <th><Clock size={15} /></th>
              {DAYS.map((d) => <th key={d}>{t(`days.${d}`)}</th>)}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((slot) => (
              <tr key={slot}>
                <th className="slot-time">{slot}</th>
                {DAYS.map((day) => {
                  const booked = grid.get(`${day}|${slot}`);
                  if (booked) {
                    return (
                      <td key={day} className="cell cell-booked">
                        <button className="cell-class" onClick={() => isAdmin && setEditing(booked)}>
                          <span className="cell-subj">{subjName(booked.subjectId)}</span>
                          <span className="cell-meta">{teacherName(booked.teacherId).split(" ")[0]}</span>
                          <span className="cell-cap">
                            {booked.currentStudents}/{booked.maxStudents}
                            {booked.isLocked && <Lock size={11} />}
                          </span>
                        </button>
                      </td>
                    );
                  }
                  if (!isAdmin) return <td key={day} className="cell" />;
                  const free = checkSlot(classes, day, slot, teacherId, roomId).ok;
                  return (
                    <td
                      key={day}
                      className={"cell " + (free ? "cell-free" : "cell-busy")}
                      onClick={() => free && setAdding({ dayOfWeek: day, timeSlot: slot })}
                    >
                      {free ? "＋" : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Classes with custom (non-standard) times don't fit the grid rows — list them here. */}
      {(() => {
        const custom = visibleClasses.filter((c) => !TIME_SLOTS.includes(c.timeSlot));
        if (custom.length === 0) return null;
        return (
          <>
            <h3 className="section-title">{t("sch.custom_slots")}</h3>
            <div className="stack">
              {custom.map((c) => (
                <div key={c.id} className="card billing-row">
                  <div>
                    <strong>{subjName(c.subjectId)}</strong>
                    <div className="muted small">
                      {t(`days.${c.dayOfWeek}`)} {c.timeSlot} · {teacherName(c.teacherId)} · {c.currentStudents}/{c.maxStudents}
                    </div>
                  </div>
                  {isAdmin && <button className="btn btn-ghost sm" onClick={() => setEditing(c)}>{t("common.edit")}</button>}
                </div>
              ))}
            </div>
          </>
        );
      })()}

      {adding && (
        <ClassForm
          defaults={{ ...adding, teacherId }}
          onClose={() => setAdding(null)}
        />
      )}
      {editing && (
        <ClassForm
          initial={editing}
          onClose={() => setEditing(null)}
          onDelete={
            isAdmin
              ? () => {
                  if (confirm(t("sch.confirm_delete"))) {
                    deleteClass(editing.id);
                    setEditing(null);
                  }
                }
              : undefined
          }
          onDuplicate={
            isAdmin
              ? () => {
                  setDuplicating({
                    subjectId: editing.subjectId,
                    teacherId: editing.teacherId,
                    level: editing.level,
                    sessionType: editing.sessionType,
                    maxStudents: editing.maxStudents,
                  });
                  setEditing(null);
                }
              : undefined
          }
        />
      )}
      {duplicating && (
        <ClassForm prefill={duplicating} onClose={() => setDuplicating(null)} />
      )}

      {requesting && (
        <Modal
          title={t("sch.request_slot")}
          onClose={() => setRequesting(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setRequesting(false)}>{t("common.cancel")}</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  addSlotRequest(teacherId, reqSubject || undefined, reqDay, reqSlot);
                  setRequesting(false);
                  setFlash(t("sch.request_sent"));
                }}
              >
                {t("sch.send_request")}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <label className="field">
              <span>{t("sch.day")}</span>
              <select className="input" value={reqDay} onChange={(e) => setReqDay(e.target.value as DayOfWeek)}>
                {DAYS.map((d) => <option key={d} value={d}>{t(`days.${d}`)}</option>)}
              </select>
            </label>
            <label className="field">
              <span>{t("sch.slot")}</span>
              <select className="input" value={reqSlot} onChange={(e) => setReqSlot(e.target.value)}>
                {TIME_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="field">
              <span>{t("sch.subject_optional")}</span>
              <select className="input" value={reqSubject} onChange={(e) => setReqSubject(e.target.value)}>
                <option value="">—</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}

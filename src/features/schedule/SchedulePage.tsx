import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CalendarClock, Clock, Lock, CircleCheck, CalendarDays, Users, Plus, Lightbulb,
  Sunrise, Sun, CloudSun, Moon, Building2,
  type LucideIcon,
} from "lucide-react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { DAYS, TIME_SLOTS, checkSlot, freeRoomsAt, gridRowFor } from "../../lib/schedule";
import Modal from "../../components/Modal";
import ClassForm from "./ClassForm";
import type { ClassRoom, DayOfWeek, TeacherSlotRequest } from "../../lib/types";
import { roomsOrDefault } from "../../lib/rooms";
import { subjectIcon, tintStyle } from "../../lib/subjectLook";
import "./schedule.css";

// Free-slot weekly builder (Cahier des Charges §5.2), wired to the store.
export default function SchedulePage() {
  const { t } = useTranslation();
  const { role, profile } = useAuth();
  const { classes, teachers, subjects, rooms: dbRooms } = useData();
  const rooms = roomsOrDefault(dbRooms);
  const deleteClass = useData((s) => s.deleteClass);
  const addSlotRequest = useData((s) => s.addSlotRequest);
  const slotRequests = useData((s) => s.slotRequests);
  const resolveSlotRequest = useData((s) => s.resolveSlotRequest);

  const isAdmin = role === "admin";
  // Teacher whose free slots are highlighted (admin picks; teacher is locked to self).
  const [teacherId, setTeacherId] = useState(
    role === "teacher" ? profile?.teacherId ?? teachers[0]?.id ?? "" : ""
  );

  // The grid shows one room at a time — a slot is only busy for the room it is in.
  const [roomId, setRoomId] = useState("");

  const [adding, setAdding] = useState<{ dayOfWeek: DayOfWeek; timeSlot: string } | null>(null);
  const [editing, setEditing] = useState<ClassRoom | null>(null);
  const [duplicating, setDuplicating] = useState<Partial<ClassRoom> | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [reqDay, setReqDay] = useState<DayOfWeek>("monday");
  const [reqSlot, setReqSlot] = useState(TIME_SLOTS[0]);
  const [reqSubject, setReqSubject] = useState("");

  /** Demande de creneau que l'on est en train de transformer en groupe. */
  const [approving, setApproving] = useState<TeacherSlotRequest | null>(null);

  const [flash, setFlash] = useState("");
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(""), 4000);
    return () => clearTimeout(id);
  }, [flash]);

  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "?";
  const teacherName = (id: string) => teachers.find((x) => x.id === id)?.name ?? "?";
  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? "—";
  const roomIds = useMemo(() => rooms.map((r) => r.id), [rooms]);

  // Salle vide = toutes les salles. C'est la vue par defaut de l'administration :
  // le centre fait tourner plusieurs salles en parallele, et le planning de la
  // semaine ne veut rien dire si on n'en voit qu'une.
  const inRoom = classes.filter((c) => !roomId || c.roomId === roomId);
  // Un enseignant ne voit que ses propres groupes. Pour l'administration, le
  // selecteur FILTRE aussi la grille : il ne servait qu'a colorer les creneaux
  // libres, si bien que choisir un enseignant ne changeait rien a l'affichage.
  const visibleClasses =
    role === "teacher"
      ? inRoom.filter((c) => c.teacherId === profile?.teacherId)
      : teacherId
      ? inRoom.filter((c) => c.teacherId === teacherId)
      : inRoom;

  // Plusieurs groupes peuvent occuper le meme creneau dans des salles
  // differentes : chaque case porte donc une LISTE, pas un seul groupe.
  const pendingRequests = useMemo(
    () => slotRequests.filter((r) => r.status === "pending"),
    [slotRequests]
  );

  const grid = useMemo(() => {
    const map = new Map<string, ClassRoom[]>();
    for (const c of visibleClasses) {
      const row = gridRowFor(c.timeSlot);
      if (!row) continue; // horaire vraiment hors grille : liste dediee plus bas
      const k = `${c.dayOfWeek}|${row}`;
      const list = map.get(k);
      if (list) list.push(c);
      else map.set(k, [c]);
    }
    for (const list of map.values()) list.sort((a, b) => a.roomId.localeCompare(b.roomId));
    return map;
  }, [visibleClasses]);

  return (
    <div className="stack">
      <header className="page-head sch-head">
        <span className="sch-head-icon" aria-hidden="true"><CalendarDays size={24} /></span>
        <div className="page-title">
          <h1>{t("nav.schedule")}</h1>
          <p>{t("sch.subtitle")}</p>
        </div>
        {isAdmin && (
          <label className="sch-pick">
            <span className="muted small">{t("nav.teachers")}</span>
            <span className="sch-pick-box">
              <Users size={16} aria-hidden="true" />
              <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                <option value="">{t("sch.all_teachers")}</option>
                {teachers.map((tc) => <option key={tc.id} value={tc.id}>{tc.name}</option>)}
              </select>
            </span>
          </label>
        )}
        {/* One room at a time: the centre runs several classes in parallel, so a
            slot is only occupied for the room it belongs to. */}
        <label className="sch-pick">
          <span className="muted small">{t("sch.room")}</span>
          <span className="sch-pick-box">
            <Building2 size={16} aria-hidden="true" />
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">{t("sch.all_rooms")}</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.capacity})
                </option>
              ))}
            </select>
          </span>
        </label>
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
          {teacherId ? t("sch.legend", { name: teacherName(teacherId) }) : t("sch.legend_all")}
        </p>
      )}

      {/* Demandes de creneau en attente. Approuver ne se contentait que de
          changer un statut : le groupe n'existait jamais et n'apparaissait donc
          nulle part. On ouvre desormais la creation, prealablement remplie. */}
      {isAdmin && pendingRequests.length > 0 && (
        <section className="card sch-requests">
          <h2 className="sch-req-title">
            <CalendarClock size={17} aria-hidden="true" />
            {t("sch.pending_requests", { n: pendingRequests.length })}
          </h2>
          <ul className="sch-req-list">
            {pendingRequests.map((r) => (
              <li key={r.id}>
                <span className="sch-req-who">
                  <strong>{teacherName(r.teacherId)}</strong>
                  <em>
                    {r.subjectId ? subjName(r.subjectId) + " · " : ""}
                    {t(`days.${r.dayOfWeek}`)} {r.timeSlot.replace("-", " - ")}
                  </em>
                </span>
                <span className="row-actions">
                  <button className="btn btn-primary sm" onClick={() => setApproving(r)}>
                    <CircleCheck size={15} /> {t("sch.approve_create")}
                  </button>
                  <button
                    className="btn btn-ghost sm"
                    onClick={() => {
                      resolveSlotRequest(r.id, "rejected");
                      setFlash(t("sch.request_rejected", { name: teacherName(r.teacherId) }));
                    }}
                  >
                    {t("notif.reject")}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="card sch-board">
        <div className="schedule-wrap">
          <table className="schedule-grid">
            <thead>
              <tr>
                <th className="sch-corner"><span><Clock size={16} /></span></th>
                {DAYS.map((d) => (
                  <th key={d}>
                    <span className="sch-day">
                      <CalendarDays size={15} aria-hidden="true" />
                      {t(`days.${d}`)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((slot) => {
                const part = partOfDay(slot);
                const PartIcon = PART_ICON[part];
                return (
                  <tr key={slot}>
                    <th className="slot-time">
                      <PartIcon size={17} className="slot-icon" aria-hidden="true" />
                      <span className="slot-range">
                        <b>{slot.replace("-", " - ")}</b>
                        <em>{t(`sch.part_${part}`)}</em>
                      </span>
                    </th>
                    {DAYS.map((day) => {
                      const booked = grid.get(`${day}|${slot}`) ?? [];
                      const slotFree = freeRoomsAt(classes, roomIds, day, slot);
                      // Sans filtre de salle, le creneau n'est libre que s'il
                      // reste au moins une salle ; avec un filtre, c'est celle-la.
                      const free = roomId
                        ? checkSlot(classes, day, slot, teacherId, roomId).ok
                        : slotFree.length > 0 &&
                          checkSlot(classes, day, slot, teacherId, undefined).teacherFree;
                      return (
                        <td key={day} className="cell">
                          <div className="cell-stack">
                            {booked.map((c) => {
                              const name = subjName(c.subjectId);
                              const Icon = subjectIcon(name);
                              return (
                                <button
                                  key={c.id}
                                  className="cell-class"
                                  style={tintStyle(name)}
                                  title={t("sch.open_group")}
                                  onClick={() => isAdmin && setEditing(c)}
                                >
                                  <span className="cell-icon" aria-hidden="true"><Icon size={15} /></span>
                                  <span className="cell-text">
                                    <span className="cell-subj">{name}</span>
                                    <span className="cell-meta">{teacherName(c.teacherId)}</span>
                                    <span className="cell-room">{roomName(c.roomId)}</span>
                                    {/* Horaire reel quand il deborde de la ligne
                                        (groupes crees avant les seances de 2 h). */}
                                    {gridRowFor(c.timeSlot) !== c.timeSlot && (
                                      <span className="cell-odd">{c.timeSlot.replace("-", " - ")}</span>
                                    )}
                                  </span>
                                  <span className="cell-cap">
                                    <Users size={11} aria-hidden="true" />
                                    {c.currentStudents}/{c.maxStudents}
                                    {c.isLocked && <Lock size={11} />}
                                  </span>
                                </button>
                              );
                            })}
                            {isAdmin && (
                              <button
                                className={"cell-empty" + (free ? "" : " busy") + (booked.length ? " tight" : "")}
                                disabled={!free}
                                title={
                                  free
                                    ? roomId
                                      ? t("sch.add_here")
                                      : t("sch.rooms_left", { n: slotFree.length })
                                    : t("sch.slot_busy")
                                }
                                onClick={() => free && setAdding({ dayOfWeek: day, timeSlot: slot })}
                              >
                                {free && <Plus size={16} aria-hidden="true" />}
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isAdmin && (
        <aside className="sch-tip">
          <span className="sch-tip-icon" aria-hidden="true"><Lightbulb size={18} /></span>
          <p><strong>{t("sch.tip_label")}</strong> {t("sch.tip_body")}</p>
          <BagArt />
        </aside>
      )}

      {/* Classes with custom (non-standard) times don't fit the grid rows — list them here. */}
      {(() => {
        const custom = visibleClasses.filter((c) => gridRowFor(c.timeSlot) === null);
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
          defaults={{ ...adding, teacherId: teacherId || undefined }}
          onClose={() => setAdding(null)}
        />
      )}
      {/* La demande n'est marquee approuvee qu'une fois le groupe reellement
          cree : refermer sans enregistrer la laisse en attente. */}
      {approving && (
        <ClassForm
          defaults={{
            dayOfWeek: approving.dayOfWeek,
            timeSlot: approving.timeSlot,
            teacherId: approving.teacherId,
          }}
          prefill={approving.subjectId ? { subjectId: approving.subjectId } : undefined}
          onClose={() => setApproving(null)}
          onCreated={() => {
            resolveSlotRequest(approving.id, "approved");
            setFlash(t("sch.request_approved", { name: teacherName(approving.teacherId) }));
            setApproving(null);
          }}
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

/* --------------------------------------------------------- moment du jour
   La colonne des heures gagne un reperage visuel : matin, midi, apres-midi,
   soir. Deduit de l'heure de debut du creneau, donc valable pour n'importe
   quelle grille horaire. */
type Part = "morning" | "noon" | "afternoon" | "evening";

const PART_ICON: Record<Part, LucideIcon> = {
  morning: Sunrise,
  noon: Sun,
  afternoon: CloudSun,
  evening: Moon,
};

function partOfDay(slot: string): Part {
  const h = Number(slot.slice(0, 2));
  if (h < 11) return "morning";
  if (h < 14) return "noon";
  if (h < 17) return "afternoon";
  return "evening";
}

/** Cartable du bandeau d'astuce. */
function BagArt() {
  return (
    <svg className="sch-tip-art" viewBox="0 0 96 64" fill="none" aria-hidden="true">
      <rect x="6" y="40" width="34" height="7" rx="2" fill="var(--navy-700)" opacity="0.3" />
      <rect x="3" y="47" width="40" height="7" rx="2" fill="var(--gold-400)" opacity="0.8" />
      <path d="M60 30v-4a8 8 0 0116 0v4" stroke="var(--navy-700)" strokeWidth="3" strokeLinecap="round" />
      <rect x="52" y="30" width="32" height="30" rx="9" fill="var(--primary)" />
      <path d="M52 42v-3a9 9 0 019-9h14a9 9 0 019 9v3z" fill="var(--navy-800)" opacity="0.4" />
      <rect x="62" y="44" width="12" height="9" rx="3" fill="#fff" opacity="0.92" />
      <path d="M24 20v7M20.5 23.5h7" stroke="var(--gold-400)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

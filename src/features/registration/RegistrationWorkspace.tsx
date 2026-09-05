import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Inbox, Users, X, GripVertical, UserPlus, CircleCheck, TriangleAlert, Trash2,
} from "lucide-react";
import { useData } from "../../data/store";
import { formatDA } from "../../lib/format";
import { LEVEL_LABEL } from "../../lib/labels";
import { computeCut } from "../../lib/payments";
import { freeRoomsAt, checkSlot } from "../../lib/schedule";
import { roomsOrDefault } from "../../lib/rooms";
import type { DayOfWeek, PaymentMode } from "../../lib/types";
import "./registration.css";

const DAYS: DayOfWeek[] = [
  "saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday",
];
const MAX_PER_GROUP = 15;

/** "2 h", "4 j" — short enough for a card corner. */
function ago(ms: number, t: (k: string, o?: Record<string, unknown>) => string): string {
  const mins = Math.max(1, Math.round((Date.now() - ms) / 60000));
  if (mins < 60) return t("reg.ago_min", { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return t("reg.ago_hour", { n: hours });
  return t("reg.ago_day", { n: Math.round(hours / 24) });
}

/**
 * One workspace for everything that arrives from outside: accounts waiting for
 * approval, enrolment requests waiting to be grouped, and the builder that turns
 * a handful of those requests into a real group.
 */
export default function RegistrationWorkspace() {
  const { t } = useTranslation();
  const {
    students, subjects, teachers, classes, registrationRequests, enrollmentRequests,
    rooms: dbRooms,
  } = useData();
  const approve = useData((s) => s.approveRegistration);
  const rejectAccount = useData((s) => s.rejectRegistration);
  const formGroup = useData((s) => s.formGroupFromRequests);
  const rejectRequest = useData((s) => s.rejectEnrollmentRequest);

  const rooms = roomsOrDefault(dbRooms);
  const studentName = (id: string) => students.find((s) => s.id === id)?.name ?? "?";
  const studentLevel = (id: string) => students.find((s) => s.id === id)?.level;
  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "?";
  const teacherName = (id: string) => teachers.find((x) => x.id === id)?.name ?? "?";

  const [flash, setFlash] = useState("");
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(""), 4000);
    return () => clearTimeout(id);
  }, [flash]);

  // ---------------------------------------------------------------- accounts
  const accountRequests = useMemo(
    () =>
      registrationRequests
        .filter((r) => r.status === "pending")
        .sort((a, b) => b.createdAt - a.createdAt),
    [registrationRequests]
  );

  // ------------------------------------------------------------- enrolments
  /** Requests bucketed by subject + teacher: only a matching pair can form a group. */
  const buckets = useMemo(() => {
    const map = new Map<string, typeof enrollmentRequests>();
    enrollmentRequests
      .filter((r) => r.status === "pending")
      .forEach((r) => {
        const key = `${r.subjectId}|${r.teacherId}`;
        map.set(key, [...(map.get(key) ?? []), r]);
      });
    return [...map.entries()];
  }, [enrollmentRequests]);

  // ---------------------------------------------------------------- builder
  const [picked, setPicked] = useState<string[]>([]);
  const [day, setDay] = useState<DayOfWeek>("monday");
  const [time, setTime] = useState("16:00-18:00");
  const [price, setPrice] = useState(2700);
  const [cutMode, setCutMode] = useState<PaymentMode>("percentage");
  const [cutValue, setCutValue] = useState(25);
  const [roomId, setRoomId] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const pickedReqs = picked
    .map((id) => enrollmentRequests.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => !!r);

  // The pair is decided by whatever was dropped first — the builder cannot mix
  // two different subject/teacher pairs into one group.
  const lockedSubject = pickedReqs[0]?.subjectId ?? "";
  const lockedTeacher = pickedReqs[0]?.teacherId ?? "";

  const freeIds = freeRoomsAt(classes, rooms.map((r) => r.id), day, time);
  const availableRooms = rooms.filter((r) => freeIds.includes(r.id));
  const effectiveRoom = availableRooms.some((r) => r.id === roomId)
    ? roomId
    : availableRooms[0]?.id ?? "";

  const slot = lockedTeacher
    ? checkSlot(classes, day, time, lockedTeacher, effectiveRoom)
    : null;
  const full = picked.length > MAX_PER_GROUP;
  const canCreate = picked.length > 0 && !full && !!effectiveRoom && (slot?.ok ?? false);

  const cut = computeCut(price, cutMode, cutValue);

  /** Add a request, refusing one that belongs to a different subject/teacher pair. */
  function add(id: string) {
    const req = enrollmentRequests.find((r) => r.id === id);
    if (!req || picked.includes(id)) return;
    if (lockedSubject && (req.subjectId !== lockedSubject || req.teacherId !== lockedTeacher)) {
      setFlash(t("reg.mixed_pair"));
      return;
    }
    setPicked((p) => [...p, id]);
  }
  const remove = (id: string) => setPicked((p) => p.filter((x) => x !== id));

  function create() {
    if (!canCreate) return;
    const made = formGroup(picked, {
      dayOfWeek: day,
      timeSlot: time,
      roomId: effectiveRoom,
      pricePerSession: price,
      schoolCutMode: cutMode,
      schoolCutValue: cutValue,
    });
    if (made) {
      setFlash(t("reg.group_created", { n: picked.length, subject: subjName(lockedSubject) }));
      setPicked([]);
    }
  }

  return (
    <div className="stack">
      <header className="page-head">
        <div className="page-title">
          <h1>{t("reg.title")}</h1>
          <p>{t("reg.subtitle")}</p>
        </div>
      </header>

      {flash && <p className="att-flash">{flash}</p>}

      <div className="reg-board">
        {/* ------------------------------------------------ 1. accounts */}
        <section className="card reg-col">
          <header className="reg-col-head">
            <h2>{t("reg.accounts")}</h2>
            <span className="reg-count">{accountRequests.length}</span>
          </header>

          {accountRequests.length === 0 ? (
            <div className="reg-empty">
              <Inbox size={22} />
              <span>{t("reg.no_accounts")}</span>
            </div>
          ) : (
            <ul className="reg-list">
              {accountRequests.map((r) => (
                <li key={r.id} className="reg-card">
                  <div className="reg-card-head">
                    <strong>{r.name}</strong>
                    <span className="reg-ago">{ago(r.createdAt, t)}</span>
                  </div>
                  <span className="muted small">
                    {t(`roles.${r.role}`)}
                    {r.level ? ` · ${LEVEL_LABEL[r.level]}` : ""}
                    {r.phone ? ` · ${r.phone}` : ""}
                  </span>
                  <div className="reg-card-actions">
                    <button
                      className="reg-btn ghost"
                      onClick={() => {
                        if (!confirm(t("req.confirm_refuse"))) return;
                        rejectAccount(r.id);
                      }}
                    >
{t("reg.reject")}
                    </button>
                    <button
                      className="reg-btn solid"
                      onClick={() => {
                        const res = approve(r.id);
                        if (res) setFlash(t("req.activated", { name: res.name }));
                      }}
                    >
{t("reg.accept")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ------------------------------------------------ 2. enrolments */}
        <section className="card reg-col">
          <header className="reg-col-head">
            <h2>{t("reg.enrolments")}</h2>
            <span className="reg-count">
              {buckets.reduce((n, [, reqs]) => n + reqs.length, 0)}
            </span>
          </header>

          {buckets.length === 0 ? (
            <div className="reg-empty">
              <Inbox size={22} />
              <span>{t("reg.no_enrolments")}</span>
            </div>
          ) : (
            <div className="reg-buckets">
              {buckets.map(([key, reqs]) => {
                const [subjectId, teacherId] = key.split("|");
                const dimmed = !!lockedSubject && (subjectId !== lockedSubject || teacherId !== lockedTeacher);
                return (
                  <div key={key} className={"reg-bucket" + (dimmed ? " dim" : "")}>
                    <h3>
                      <span className="reg-dot" aria-hidden="true" />
                      {subjName(subjectId)} — {teacherName(teacherId)}
                      <em>({reqs.length})</em>
                    </h3>
                    <ul className="reg-list">
                      {reqs.map((r) => {
                        const inBuilder = picked.includes(r.id);
                        return (
                          <li
                            key={r.id}
                            className={"reg-card drag" + (inBuilder ? " used" : "")}
                            draggable={!inBuilder}
                            onDragStart={(e) => e.dataTransfer.setData("text/plain", r.id)}
                            onDoubleClick={() => add(r.id)}
                          >
                            <GripVertical size={14} className="reg-grip" aria-hidden="true" />
                            <div className="reg-card-body">
                              <strong>{studentName(r.studentId)}</strong>
                              <span className="muted small">
                                {studentLevel(r.studentId) ? LEVEL_LABEL[studentLevel(r.studentId)!] : "—"}
                              </span>
                            </div>
                            {inBuilder ? (
                              <span className="reg-pill in">{t("reg.in_builder")}</span>
                            ) : (
                              <span className="reg-pill">{t("reg.pending")}</span>
                            )}
                            {/* Kept out of the way until the row is hovered, so the
                                column reads as a clean list of names. */}
                            <span className="reg-row-actions">
                              {!inBuilder && (
                                <button
                                  className="reg-icon-btn add"
                                  title={t("reg.add_to_group")}
                                  onClick={() => add(r.id)}
                                >
                                  <UserPlus size={13} />
                                </button>
                              )}
                              <button
                                className="reg-icon-btn del"
                                title={t("reg.reject")}
                                onClick={() => {
                                  if (!confirm(t("req.confirm_refuse"))) return;
                                  rejectRequest(r.id);
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ------------------------------------------------ 3. builder */}
        <section className="card reg-col reg-builder">
          <header className="reg-col-head">
            <h2>{t("reg.builder")}</h2>
            {picked.length > 0 && (
              <button className="reg-clear" onClick={() => setPicked([])}>
                {t("reg.clear_all")}
              </button>
            )}
          </header>

          <div className="reg-fields pair">
            <label className="field">
              <span>{t("cf.subject")}</span>
              <input className="input" readOnly value={lockedSubject ? subjName(lockedSubject) : "—"} />
            </label>
            <label className="field">
              <span>{t("hist.teacher_word")}</span>
              <input className="input" readOnly value={lockedTeacher ? teacherName(lockedTeacher) : "—"} />
            </label>
          </div>

          <div className="reg-fields trio">
            <label className="field">
              <span>{t("sch.day")}</span>
              <select className="input" value={day} onChange={(e) => setDay(e.target.value as DayOfWeek)}>
                {DAYS.map((d) => (
                  <option key={d} value={d}>{t(`days.${d}`)}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t("att.slot")}</span>
              <input className="input" value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
            <label className="field">
              <span>{t("cf.room")}</span>
              <select className="input" value={effectiveRoom} onChange={(e) => setRoomId(e.target.value)}>
                {availableRooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} ({r.capacity})</option>
                ))}
                {availableRooms.length === 0 && <option value="">{t("reg.no_free_room")}</option>}
              </select>
            </label>
            <label className="field">
              <span>{t("cf.price")}</span>
              <input
                className="input"
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </label>
            <label className="field">
              <span>{t("reg.cut_mode")}</span>
              <select
                className="input"
                value={cutMode}
                onChange={(e) => setCutMode(e.target.value as PaymentMode)}
              >
                <option value="percentage">%</option>
                <option value="fixed">DA</option>
              </select>
            </label>
            <label className="field">
              <span>{t("reg.split")}</span>
              <input
                className="input"
                type="number"
                value={cutValue}
                onChange={(e) => setCutValue(Number(e.target.value))}
              />
            </label>
          </div>

          <p className="muted small reg-split-note">
            {t("cf.split_preview", {
              price: formatDA(price),
              school: formatDA(cut.schoolCut),
              teacher: formatDA(cut.teacherCut),
            })}
          </p>

          {/* Drop target: drag a request across, or use the + on a card. */}
          <div
            className={"reg-dropzone" + (dragOver ? " over" : "") + (picked.length ? " filled" : "")}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              add(e.dataTransfer.getData("text/plain"));
            }}
          >
            {picked.length === 0 ? (
              <div className="reg-dropzone-empty">
                <span className="reg-dropzone-icon"><UserPlus size={20} /></span>
                <strong>{t("reg.drop_here")}</strong>
                <span className="muted small">{t("reg.max_students", { n: MAX_PER_GROUP })}</span>
              </div>
            ) : (
              <ul className="reg-picked">
                {pickedReqs.map((r) => (
                  <li key={r.id}>
                    <Users size={13} aria-hidden="true" />
                    <span>{studentName(r.studentId)}</span>
                    <button onClick={() => remove(r.id)} aria-label={t("reg.remove")}>
                      <X size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <footer className="reg-builder-foot">
            {full ? (
              <span className="reg-status bad">
                <TriangleAlert size={14} /> {t("reg.too_many", { n: MAX_PER_GROUP })}
              </span>
            ) : !effectiveRoom ? (
              <span className="reg-status bad">
                <TriangleAlert size={14} /> {t("reg.no_free_room")}
              </span>
            ) : slot && !slot.ok ? (
              <span className="reg-status bad">
                <TriangleAlert size={14} />
                {slot.reason === "room_taken" ? t("cf.slot_taken") : t("cf.teacher_busy")}
              </span>
            ) : (
              <span className="reg-status ok">
                <CircleCheck size={14} /> {t("reg.no_conflict")}
              </span>
            )}
            <button className="reg-create" disabled={!canCreate} onClick={create}>
              {t("reg.create_group", { n: picked.length })}
            </button>
          </footer>
        </section>
      </div>
    </div>
  );
}

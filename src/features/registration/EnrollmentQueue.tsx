import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Users, X, Inbox } from "lucide-react";
import { useData } from "../../data/store";
import { formatDA } from "../../lib/format";
import { DAY_LABEL } from "../../lib/labels";
import { computeCut } from "../../lib/payments";
import { freeRoomsAt } from "../../lib/schedule";
import type { DayOfWeek, PaymentMode } from "../../lib/types";

const DAYS: DayOfWeek[] = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"];

// Admin queue of تسجيلات. Requests are bucketed by subject + teacher, because a
// group can only be formed from students who asked for the same pair.
export default function EnrollmentQueue() {
  const { t } = useTranslation();
  const { students, subjects, teachers, enrollmentRequests, rooms, classes } = useData();
  const formGroup = useData((s) => s.formGroupFromRequests);
  const rejectRequest = useData((s) => s.rejectEnrollmentRequest);

  const [selected, setSelected] = useState<string[]>([]);
  const [day, setDay] = useState<DayOfWeek>("monday");
  const [time, setTime] = useState("17:00-18:30");
  const [price, setPrice] = useState(2700);
  const [cutMode, setCutMode] = useState<PaymentMode>("percentage");
  const [cutValue, setCutValue] = useState(25);
  const [roomId, setRoomId] = useState("");

  const studentName = (id: string) => students.find((s) => s.id === id)?.name ?? "?";
  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "?";
  const teacherName = (id: string) => teachers.find((x) => x.id === id)?.name ?? "?";

  // subjectId|teacherId -> requests
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

  const cut = computeCut(price, cutMode, cutValue);
  // Only rooms actually free at the chosen day/time are offered.
  const freeIds = freeRoomsAt(classes, rooms.map((r) => r.id), day, time);
  const availableRooms = rooms.filter((r) => freeIds.includes(r.id));
  const effectiveRoom = availableRooms.some((r) => r.id === roomId) ? roomId : availableRooms[0]?.id ?? "";

  function toggle(id: string, bucketKey: string) {
    setSelected((prev) => {
      // Selecting across buckets is invalid — reset when the pair changes.
      const first = enrollmentRequests.find((r) => r.id === prev[0]);
      const sameBucket = !first || `${first.subjectId}|${first.teacherId}` === bucketKey;
      const base = sameBucket ? prev : [];
      return base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
    });
  }

  function create() {
    if (selected.length === 0) return;
    const made = formGroup(selected, {
      dayOfWeek: day,
      timeSlot: time,
      roomId: effectiveRoom,
      pricePerSession: price,
      schoolCutMode: cutMode,
      schoolCutValue: cutValue,
    });
    if (made) setSelected([]);
  }

  if (buckets.length === 0) {
    return (
      <div className="reg-empty-state">
        <div className="reg-empty-icon-box">
          <Inbox size={28} />
        </div>
        <p className="reg-empty-text">Aucune inscription en attente.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      {buckets.map(([key, reqs]) => {
        const [subjectId, teacherId] = key.split("|");
        return (
          <div key={key} className="card">
            <div className="course-head">
              <span className="stat-icon badge-gold" aria-hidden="true">
                <Users size={18} />
              </span>
              <div>
                <strong>{subjName(subjectId)}</strong>
                <div className="muted small">
                  {teacherName(teacherId)} · {reqs.length} {t("enrolQueue.requests")}
                </div>
              </div>
            </div>

            <div className="checkbox-list">
              {reqs.map((r) => (
                <label key={r.id} className={"chip-toggle" + (selected.includes(r.id) ? " on" : "")}>
                  <input
                    type="checkbox"
                    checked={selected.includes(r.id)}
                    onChange={() => toggle(r.id, key)}
                  />
                  {studentName(r.studentId)}
                  <button
                    type="button"
                    className="icon-btn danger sm"
                    title={t("common.reject")}
                    onClick={(e) => {
                      e.preventDefault();
                      rejectRequest(r.id);
                    }}
                  >
                    <X size={13} />
                  </button>
                </label>
              ))}
            </div>
          </div>
        );
      })}

      {/* Group settings — day, time, price and the school's share all live on the
          group, so two groups of the same teacher can differ. */}
      <div className="card">
        <h3 className="section-title" style={{ marginTop: 0 }}>
          {t("enrolQueue.formGroup")} ({selected.length})
        </h3>

        <div className="form-grid">
          <label className="field">
            {t("enrolQueue.day")}
            <select className="input" value={day} onChange={(e) => setDay(e.target.value as DayOfWeek)}>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {DAY_LABEL[d]}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            {t("enrolQueue.time")}
            <input className="input" value={time} onChange={(e) => setTime(e.target.value)} placeholder="17:00-18:30" />
          </label>

          <label className="field">
            {t("enrolQueue.room")}
            <select className="input" value={effectiveRoom} onChange={(e) => setRoomId(e.target.value)}>
              {availableRooms.length === 0 && <option value="">{t("enrolQueue.noRoom")}</option>}
              {availableRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.capacity})
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            {t("enrolQueue.price")}
            <input
              className="input"
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </label>

          <label className="field">
            {t("enrolQueue.cutMode")}
            <select className="input" value={cutMode} onChange={(e) => setCutMode(e.target.value as PaymentMode)}>
              <option value="percentage">{t("enrolQueue.percentage")}</option>
              <option value="fixed">{t("enrolQueue.fixed")}</option>
            </select>
          </label>

          <label className="field">
            {cutMode === "percentage" ? "%" : "DA"}
            <input
              className="input"
              type="number"
              min={0}
              value={cutValue}
              onChange={(e) => setCutValue(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="preview-box">
          {t("enrolQueue.perSession")} — {t("enrolQueue.school")} <strong>{formatDA(cut.schoolCut)}</strong> ·{" "}
          {t("enrolQueue.teacher")} <strong>{formatDA(cut.teacherCut)}</strong>
        </div>

        <button className="btn btn-primary" onClick={create} disabled={selected.length === 0 || !effectiveRoom}>
          {t("enrolQueue.create")}
        </button>
      </div>
    </div>
  );
}

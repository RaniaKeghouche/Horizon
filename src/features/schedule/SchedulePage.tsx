import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DAYS, TIME_SLOTS, checkSlot } from "../../lib/schedule";
import type { ClassRoom, DayOfWeek } from "../../lib/types";

// Weekly free-slot grid (Cahier des Charges §5.2). Works on local state for now;
// once Firebase creds are set this list comes from the `classes` collection.
// A slot is "free" only when the slot itself is empty AND the picked teacher is free.
export default function SchedulePage() {
  const { t } = useTranslation();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  // Teacher currently being placed — free slots are shown relative to this teacher.
  const [teacherId] = useState("demo-teacher");

  const grid = useMemo(() => {
    return DAYS.map((day) => ({
      day,
      slots: TIME_SLOTS.map((timeSlot) => {
        const booked = classes.find(
          (c) => c.dayOfWeek === day && c.timeSlot === timeSlot
        );
        const check = checkSlot(classes, day, timeSlot, teacherId);
        return { timeSlot, booked, free: check.ok };
      }),
    }));
  }, [classes, teacherId]);

  function place(day: DayOfWeek, timeSlot: string) {
    if (!checkSlot(classes, day, timeSlot, teacherId).ok) return;
    setClasses((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        subjectId: "demo",
        teacherId,
        level: "high",
        sessionType: "group",
        dayOfWeek: day,
        timeSlot,
        maxStudents: 15,
        currentStudents: 0,
        isLocked: false,
        // Timestamp placeholder — real value set by Firestore on write.
        createdAt: null as never,
      },
    ]);
  }

  function remove(id: string) {
    setClasses((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="stack">
      <h1>{t("nav.schedule")}</h1>
      <p className="muted">
        Cliquez sur un créneau libre pour y placer une classe (démo). La suppression
        libère instantanément le créneau et l'enseignant.
      </p>

      <div className="schedule-wrap">
        <table className="schedule-grid">
          <thead>
            <tr>
              <th>⏰</th>
              {DAYS.map((d) => (
                <th key={d}>{t(`days.${d}`, d)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((slot) => (
              <tr key={slot}>
                <th className="slot-time">{slot}</th>
                {grid.map(({ day, slots }) => {
                  const cell = slots.find((s) => s.timeSlot === slot)!;
                  if (cell.booked) {
                    return (
                      <td key={day} className="cell cell-booked">
                        <button className="cell-class" onClick={() => remove(cell.booked!.id)}>
                          📘 {cell.booked.subjectId}
                          <span className="cell-x">✕</span>
                        </button>
                      </td>
                    );
                  }
                  return (
                    <td
                      key={day}
                      className={"cell " + (cell.free ? "cell-free" : "cell-busy")}
                      onClick={() => place(day, slot)}
                    >
                      {cell.free ? "＋" : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

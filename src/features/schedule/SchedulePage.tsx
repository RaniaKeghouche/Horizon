import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { DAYS, TIME_SLOTS, checkSlot } from "../../lib/schedule";
import { DAY_LABEL } from "../../lib/labels";
import ClassForm from "./ClassForm";
import type { ClassRoom, DayOfWeek } from "../../lib/types";

// Free-slot weekly builder (Cahier des Charges §5.2), wired to the store.
export default function SchedulePage() {
  const { t } = useTranslation();
  const { role, profile } = useAuth();
  const { classes, teachers, subjects } = useData();
  const deleteClass = useData((s) => s.deleteClass);

  const isAdmin = role === "admin";
  // Teacher whose free slots are highlighted (admin picks; teacher is locked to self).
  const [teacherId, setTeacherId] = useState(
    role === "teacher" ? profile?.teacherId ?? teachers[0]?.id ?? "" : teachers[0]?.id ?? ""
  );

  const [adding, setAdding] = useState<{ dayOfWeek: DayOfWeek; timeSlot: string } | null>(null);
  const [editing, setEditing] = useState<ClassRoom | null>(null);

  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "?";
  const teacherName = (id: string) => teachers.find((x) => x.id === id)?.name ?? "?";

  // For teachers, show only their own classes on the grid.
  const visibleClasses = role === "teacher"
    ? classes.filter((c) => c.teacherId === teacherId)
    : classes;

  const grid = useMemo(() => {
    const map = new Map<string, ClassRoom>();
    for (const c of visibleClasses) map.set(`${c.dayOfWeek}|${c.timeSlot}`, c);
    return map;
  }, [visibleClasses]);

  return (
    <div className="stack">
      <div className="page-head">
        <h1>{t("nav.schedule")}</h1>
        {isAdmin && (
          <div className="teacher-pick">
            <span className="muted small">Créneaux libres pour :</span>
            <select className="input" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              {teachers.map((tc) => <option key={tc.id} value={tc.id}>{tc.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {isAdmin && (
        <p className="muted">
          Vert = libre pour <strong>{teacherName(teacherId)}</strong> (créneau vide + enseignant
          disponible). Cliquez pour ajouter. Cliquez une classe pour la modifier ou la déplacer.
        </p>
      )}

      <div className="schedule-wrap">
        <table className="schedule-grid">
          <thead>
            <tr>
              <th>⏰</th>
              {DAYS.map((d) => <th key={d}>{DAY_LABEL[d]}</th>)}
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
                          <span className="cell-subj">📘 {subjName(booked.subjectId)}</span>
                          <span className="cell-meta">{teacherName(booked.teacherId).split(" ")[0]}</span>
                          <span className="cell-cap">{booked.currentStudents}/{booked.maxStudents}{booked.isLocked ? " 🔒" : ""}</span>
                        </button>
                      </td>
                    );
                  }
                  if (!isAdmin) return <td key={day} className="cell" />;
                  const free = checkSlot(classes, day, slot, teacherId).ok;
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
                  if (confirm("Supprimer cette classe ? Le créneau redeviendra libre.")) {
                    deleteClass(editing.id);
                    setEditing(null);
                  }
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

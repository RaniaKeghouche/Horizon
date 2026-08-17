// Daily "Today & Tomorrow" programme digest (cahier §5.4).
import type { ClassRoom, DayOfWeek, Subject, Teacher } from "./types";
import { DAY_LABEL } from "./labels";

const JS_DAY_TO_ENUM: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function dayEnum(date: Date): DayOfWeek {
  return JS_DAY_TO_ENUM[date.getDay()];
}

function lineFor(classes: ClassRoom[], day: DayOfWeek, subjects: Subject[], teachers: Teacher[]): string {
  const list = classes
    .filter((c) => c.dayOfWeek === day)
    .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
    .map((c) => {
      const subj = subjects.find((s) => s.id === c.subjectId)?.name ?? "?";
      const teacher = teachers.find((t) => t.id === c.teacherId)?.name ?? "?";
      return `${c.timeSlot} ${subj} (${teacher})`;
    });
  return list.length ? list.join(" · ") : "aucune classe";
}

/** Build the digest message summarising today's and tomorrow's classes. */
export function buildDigest(classes: ClassRoom[], subjects: Subject[], teachers: Teacher[]): string {
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const td = dayEnum(today);
  const tm = dayEnum(tomorrow);
  return (
    `Aujourd'hui (${DAY_LABEL[td]}) : ${lineFor(classes, td, subjects, teachers)}. ` +
    `Demain (${DAY_LABEL[tm]}) : ${lineFor(classes, tm, subjects, teachers)}.`
  );
}

// Pure scheduling logic — the two-part free-slot check (Cahier des Charges §5.2).
import type { ClassRoom, DayOfWeek } from "./types";

export const DAYS: DayOfWeek[] = [
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

// Standard slots — a language center typically runs afternoon/evening blocks.
export const TIME_SLOTS: string[] = [
  "08:00-09:30",
  "09:30-11:00",
  "11:00-12:30",
  "14:00-15:30",
  "15:30-17:00",
  "17:00-18:30",
  "18:30-20:00",
];

export interface SlotCheck {
  slotFree: boolean; // no other class booked on this day/time
  teacherFree: boolean; // this teacher has no other class at this day/time
  ok: boolean;
  reason?: string;
}

/**
 * The two-part free-slot check. A slot is placeable only when BOTH are true:
 *   1. no other class occupies that day/time
 *   2. the chosen teacher isn't already assigned elsewhere at that day/time
 * `excludeClassId` lets an existing class be edited/moved without conflicting with itself.
 */
export function checkSlot(
  classes: ClassRoom[],
  day: DayOfWeek,
  timeSlot: string,
  teacherId: string,
  excludeClassId?: string
): SlotCheck {
  const others = classes.filter((c) => c.id !== excludeClassId);

  const slotFree = !others.some((c) => c.dayOfWeek === day && c.timeSlot === timeSlot);
  const teacherFree = !others.some(
    (c) => c.dayOfWeek === day && c.timeSlot === timeSlot && c.teacherId === teacherId
  );

  let reason: string | undefined;
  if (!slotFree) reason = "slot_taken";
  else if (!teacherFree) reason = "teacher_busy";

  return { slotFree, teacherFree, ok: slotFree && teacherFree, reason };
}

/** All (day, time) slots where a given teacher can be placed. */
export function freeSlotsForTeacher(
  classes: ClassRoom[],
  teacherId: string
): { day: DayOfWeek; timeSlot: string }[] {
  const free: { day: DayOfWeek; timeSlot: string }[] = [];
  for (const day of DAYS) {
    for (const timeSlot of TIME_SLOTS) {
      if (checkSlot(classes, day, timeSlot, teacherId).ok) {
        free.push({ day, timeSlot });
      }
    }
  }
  return free;
}

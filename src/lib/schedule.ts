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
  roomFree: boolean; // this room has no other class at this day/time
  teacherFree: boolean; // this teacher has no other class at this day/time
  ok: boolean;
  reason?: string;
}

/**
 * The two-part free-slot check, per room.
 *
 * A slot is placeable only when BOTH hold:
 *   1. that ROOM is empty at the day/time. Other rooms may well be busy — the
 *      centre runs several classes in parallel, so a time slot is never
 *      globally exclusive.
 *   2. the chosen teacher is not already teaching somewhere else then.
 *
 * `excludeClassId` lets an existing class be edited or moved without clashing
 * with itself. Omitting `roomId` answers only the teacher half.
 */
export function checkSlot(
  classes: ClassRoom[],
  day: DayOfWeek,
  timeSlot: string,
  teacherId: string,
  roomId?: string,
  excludeClassId?: string
): SlotCheck {
  const others = classes.filter((c) => c.id !== excludeClassId);
  const at = others.filter((c) => c.dayOfWeek === day && c.timeSlot === timeSlot);

  const roomFree = roomId ? !at.some((c) => c.roomId === roomId) : true;
  const teacherFree = !at.some((c) => c.teacherId === teacherId);

  let reason: string | undefined;
  if (!roomFree) reason = "room_taken";
  else if (!teacherFree) reason = "teacher_busy";

  return { roomFree, teacherFree, ok: roomFree && teacherFree, reason };
}

/** All (day, time) slots where a given teacher can be placed, optionally in a room. */
export function freeSlotsForTeacher(
  classes: ClassRoom[],
  teacherId: string,
  roomId?: string
): { day: DayOfWeek; timeSlot: string }[] {
  const free: { day: DayOfWeek; timeSlot: string }[] = [];
  for (const day of DAYS) {
    for (const timeSlot of TIME_SLOTS) {
      if (checkSlot(classes, day, timeSlot, teacherId, roomId).ok) {
        free.push({ day, timeSlot });
      }
    }
  }
  return free;
}

/** Which rooms are still free at a given day/time. */
export function freeRoomsAt(
  classes: ClassRoom[],
  roomIds: string[],
  day: DayOfWeek,
  timeSlot: string,
  excludeClassId?: string
): string[] {
  const busy = new Set(
    classes
      .filter((c) => c.id !== excludeClassId && c.dayOfWeek === day && c.timeSlot === timeSlot)
      .map((c) => c.roomId)
  );
  return roomIds.filter((id) => !busy.has(id));
}

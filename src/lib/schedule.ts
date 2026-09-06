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
// Une seance dure DEUX heures : c'est la duree reelle des cours du centre, et
// c'est deja ce que propose ClassForm (addHours(start, 2)). La grille etait
// restee sur des blocs d'1h30, ce qui rendait les deux incoherents. La coupure
// de midi (12:00-14:00) est conservee.
export const SESSION_HOURS = 2;

export const TIME_SLOTS: string[] = [
  "08:00-10:00",
  "10:00-12:00",
  "14:00-16:00",
  "16:00-18:00",
  "18:00-20:00",
];

/** "8:00 - 10:00" -> "08:00-10:00". Les creneaux arrivent de plusieurs endroits
 *  (formulaire, import, anciennes donnees) : on compare des chaines normalisees
 *  plutot que des chaines brutes. */
export function normalizeSlot(timeSlot: string): string {
  const pad = (t: string) => {
    const [h, m] = t.trim().split(":");
    return `${(h ?? "0").padStart(2, "0")}:${(m ?? "00").padStart(2, "0")}`;
  };
  const [a, b] = timeSlot.split("-");
  return b ? `${pad(a)}-${pad(b)}` : pad(timeSlot);
}

/**
 * La ligne de la grille ou poser un cours.
 *
 * On compare l'HEURE DE DEBUT, pas la chaine entiere : un groupe cree avant le
 * passage aux seances de deux heures porte encore « 17:00-18:30 » et
 * disparaissait de la semaine, releguee dans la liste des horaires
 * personnalises. Il s'affiche desormais sur la ligne de 16:00, avec son horaire
 * reel indique sur la carte.
 *
 * `null` quand aucune ligne ne commence a cette heure-la : le cours reste alors
 * listee a part, ce qui est le bon comportement pour un horaire vraiment hors
 * grille.
 */
export function gridRowFor(timeSlot: string, slots: string[] = TIME_SLOTS): string | null {
  const norm = normalizeSlot(timeSlot);
  if (slots.includes(norm)) return norm;
  const start = norm.split("-")[0];
  const exact = slots.find((s) => s.split("-")[0] === start);
  if (exact) return exact;
  // Sinon, la ligne dont la plage contient l'heure de debut.
  const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const at = mins(start);
  return slots.find((s) => {
    const [a, b] = s.split("-");
    return at >= mins(a) && at < mins(b);
  }) ?? null;
}

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

/** Le jour de la semaine d'une date, dans le vocabulaire de l'application.
 *  `getDay()` compte a partir de dimanche = 0 ; DAYS commence a samedi, qui
 *  est le premier jour ouvre de la semaine scolaire algerienne. */
export function dayOfWeekOf(d: Date = new Date()): DayOfWeek {
  const fromSunday: DayOfWeek[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return fromSunday[d.getDay()];
}

/** La derniere fois que ce jour est tombe, aujourd'hui compris.
 *
 *  C'est la date qu'attend un appel : on pointe une seance qui a eu lieu, pas
 *  une seance a venir. Pour un groupe du lundi consulte un samedi, la reponse
 *  est le lundi precedent — jamais le lundi suivant, qui n'a pas encore eu
 *  lieu et pour lequel il n'y a rien a pointer. */
export function lastOccurrence(day: DayOfWeek, from: Date = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const target = DAYS.indexOf(day);
  const current = DAYS.indexOf(dayOfWeekOf(d));
  if (target < 0 || current < 0) return d;
  // Modulo 7 : si le jour vise est plus loin dans la semaine que le jour
  // courant, il faut remonter a la semaine precedente.
  const back = (current - target + 7) % 7;
  d.setDate(d.getDate() - back);
  return d;
}

/** Le groupe qui a cours ce jour-la, le plus tot dans la journee.
 *  `undefined` si aucun groupe ne se reunit ce jour. */
export function classOnDay<T extends { dayOfWeek: DayOfWeek; timeSlot: string }>(
  list: T[],
  day: DayOfWeek = dayOfWeekOf()
): T | undefined {
  return list
    .filter((c) => c.dayOfWeek === day)
    .sort((a, b) => normalizeSlot(a.timeSlot).localeCompare(normalizeSlot(b.timeSlot)))[0];
}

/**
 * Les enseignants habilites pour une matiere A UN NIVEAU donne.
 *
 * Regle de repli deliberee : si rien n'a ete declare pour ce couple, on rend la
 * liste complete. Une liste vide empecherait de creer le moindre groupe, ce qui
 * transformerait une aide a la saisie en blocage.
 *
 * `currentId` est l'enseignant deja retenu : il reste toujours dans la liste,
 * sinon ouvrir un groupe existant en modification le remplacerait en silence.
 */
export function allowedTeachersFor<T extends { id: string }>(
  teachersByLevel: Partial<Record<string, string[]>> | undefined,
  level: string,
  teachers: T[],
  currentId?: string
): T[] {
  const declared = teachersByLevel?.[level] ?? [];
  const allowed = teachers.filter((x) => declared.includes(x.id));
  if (allowed.length === 0) return teachers;
  const current = teachers.find((x) => x.id === currentId);
  return current && !allowed.some((x) => x.id === currentId) ? [...allowed, current] : allowed;
}

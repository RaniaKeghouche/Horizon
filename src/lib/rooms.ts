import type { Room } from "./types";

/**
 * The centre's five physical rooms.
 *
 * These are a fact about the building, not user data, so they ship with the app
 * instead of living only in the `rooms` table. That also means the schedule
 * keeps working when the table is missing or empty — before this, the room
 * picker just said "Aucune salle enregistrée" and every class was roomless.
 *
 * Ids match src/data/seed.ts and supabase/SETUP.sql, so a row loaded from the
 * database replaces its built-in twin rather than duplicating it.
 */
export const DEFAULT_ROOMS: Room[] = [
  { id: "rm_big", name: "Grande salle", capacity: 20, kind: "large" },
  { id: "rm_1", name: "Classe 1", capacity: 12, kind: "standard" },
  { id: "rm_2", name: "Classe 2", capacity: 12, kind: "standard" },
  { id: "rm_indiv", name: "Salle individuelle", capacity: 2, kind: "individual" },
  { id: "rm_office", name: "Bureau", capacity: 4, kind: "office" },
];

/**
 * Rooms to offer in the UI: whatever the database holds, plus any built-in room
 * it does not have. Never returns an empty list.
 */
export function roomsOrDefault(rooms: Room[]): Room[] {
  if (rooms.length === 0) return DEFAULT_ROOMS;
  const known = new Set(rooms.map((r) => r.id));
  return [...rooms, ...DEFAULT_ROOMS.filter((r) => !known.has(r.id))];
}

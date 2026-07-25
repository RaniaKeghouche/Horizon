// French display labels for enum values (kept out of i18n JSON to stay concise).
import type {
  AttendanceState,
  DayOfWeek,
  PaymentMode,
  SessionType,
  StudentLevel,
  StudentStatus,
} from "./types";

export const LEVEL_LABEL: Record<StudentLevel, string> = {
  primary: "Primaire",
  middle: "Collège",
  high: "Lycée",
  level_based: "Par niveau",
  summer: "École d'été",
};

export const STATUS_LABEL: Record<StudentStatus, string> = {
  active: "Actif",
  paused: "En pause",
  stopped: "Arrêté",
};

export const SESSION_TYPE_LABEL: Record<SessionType, string> = {
  group: "Groupe",
  one_on_one: "Cours particulier",
  group_special: "Groupe spécial",
  summer: "École d'été",
};

export const PAYMENT_MODE_LABEL: Record<PaymentMode, string> = {
  percentage: "Pourcentage",
  fixed: "Montant fixe",
};

export const ATTENDANCE_LABEL: Record<AttendanceState, string> = {
  present: "Présent",
  absent_paid: "Absent (facturé)",
  absent_free: "Absent (gratuit)",
};

export const DAY_LABEL: Record<DayOfWeek, string> = {
  saturday: "Samedi",
  sunday: "Dimanche",
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
};

export const LEVELS: StudentLevel[] = ["primary", "middle", "high", "level_based", "summer"];
export const STATUSES: StudentStatus[] = ["active", "paused", "stopped"];
export const SESSION_TYPES: SessionType[] = ["group", "one_on_one", "group_special", "summer"];

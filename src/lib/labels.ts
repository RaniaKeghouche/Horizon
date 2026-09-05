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
  "1ap": "1AP", "2ap": "2AP", "3ap": "3AP", "4ap": "4AP", "5ap": "5AP",
  "1am": "1AM", "2am": "2AM", "3am": "3AM", "4am": "4AM",
  "1as": "1AS", "2as": "2AS", "3as": "3AS",
};

/**
 * Les cycles algeriens et leurs niveaux, sans libelle.
 *
 * Le libelle est desormais une cle i18n (voir useLabels) : ecrit ici en dur, il
 * restait en francais quelle que soit la langue choisie. La STRUCTURE, elle,
 * n'a pas a etre traduite et reste donc ici.
 */
export const LEVEL_CYCLES: { key: "ap" | "am" | "as"; levels: StudentLevel[] }[] = [
  { key: "ap", levels: ["1ap", "2ap", "3ap", "4ap", "5ap"] },
  { key: "am", levels: ["1am", "2am", "3am", "4am"] },
  { key: "as", levels: ["1as", "2as", "3as"] },
];

export const STATUS_LABEL: Record<StudentStatus, string> = {
  active: "Actif",
  paused: "En pause",
  stopped: "Arrêté",
};

/**
 * ATTENTION — ces tables restent en francais A DESSEIN.
 *
 * Elles ne servent plus a l'interface (voir lib/useLabels.ts) mais aux ecrits
 * qui doivent rester stables : la sauvegarde Google Sheets et le texte des
 * notifications enregistrees en base. Un message ecrit en arabe parce que
 * l'enseignant avait bascule la langue serait illisible pour l'administration.
 */
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

export const LEVELS: StudentLevel[] = [
  "1ap", "2ap", "3ap", "4ap", "5ap", "1am", "2am", "3am", "4am", "1as", "2as", "3as",
];
export const STATUSES: StudentStatus[] = ["active", "paused", "stopped"];
export const SESSION_TYPES: SessionType[] = ["group", "one_on_one", "group_special", "summer"];

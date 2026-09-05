import { useTranslation } from "react-i18next";
import { LEVEL_CYCLES } from "./labels";
import type {
  AttendanceState,
  DayOfWeek,
  PaymentMode,
  SessionType,
  StudentLevel,
  StudentStatus,
} from "./types";

/**
 * Les libelles des enumerations, traduits.
 *
 * Ils vivaient dans labels.ts sous forme de tables francaises en dur — « Groupe »,
 * « Cours particulier », « Actif », « Pourcentage », « Primaire (5 ans) »… Ces
 * mots apparaissent dans les listes deroulantes, les cartes de cours et les
 * fiches eleve, si bien que changer de langue laissait une bonne part de
 * l'interface en francais : la traduction semblait ne pas fonctionner.
 *
 * Ces tables ne pouvaient pas simplement appeler t() : elles sont evaluees au
 * chargement du module, une fois pour toutes, alors que la langue change en
 * cours de route. D'ou ce hook — il se re-execute au changement de langue,
 * comme n'importe quel composant.
 *
 * labels.ts garde ses valeurs francaises pour ce qui n'est PAS de l'interface :
 * la sauvegarde Google Sheets et le texte des notifications enregistrees, qui
 * doivent rester stables quelle que soit la langue de qui les a declenchees.
 */
export function useLabels() {
  const { t } = useTranslation();

  return {
    sessionType: (v: SessionType) => t("enum.session_" + v),
    status: (v: StudentStatus) => t("enum.status_" + v),
    paymentMode: (v: PaymentMode) => t("enum.pay_" + v),
    /** Deja traduits ailleurs : on reutilise les cles existantes. */
    attendance: (v: AttendanceState) => t("attendance." + v),
    day: (v: DayOfWeek) => t("days." + v),
    /** Les niveaux groupes par cycle, pour les <optgroup>. */
    levelGroups: (): { label: string; levels: StudentLevel[] }[] =>
      LEVEL_CYCLES.map((c) => ({ label: t("enum.cycle_" + c.key), levels: c.levels })),
  };
}

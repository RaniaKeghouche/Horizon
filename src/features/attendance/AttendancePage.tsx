import FeaturePlaceholder from "../../components/FeaturePlaceholder";
import { useTranslation } from "react-i18next";

export default function AttendancePage() {
  const { t } = useTranslation();
  return (
    <FeaturePlaceholder
      icon="✅"
      title={t("nav.attendance")}
      points={[
        "Le prof choisit sa classe et pointe chaque élève : présent / absent-facturé / absent-gratuit",
        "Mode hors-ligne : sauvegarde locale puis synchro auto au retour d'internet",
        "Notification push instantanée au parent et à l'élève",
        "Note de séance rédigée par le prof, visible par le parent",
        "Historique complet de présence (lecture seule côté étudiant)",
      ]}
    />
  );
}

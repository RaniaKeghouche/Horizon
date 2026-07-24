import FeaturePlaceholder from "../../components/FeaturePlaceholder";
import { useTranslation } from "react-i18next";

export default function TeachersPage() {
  const { t } = useTranslation();
  return (
    <FeaturePlaceholder
      icon="👨‍🏫"
      title={t("nav.teachers")}
      points={[
        "Ajout / édition des enseignants et de leurs matières",
        "Mode de part de l'école : pourcentage ou montant fixe (modifiable à tout moment)",
        "Récapitulatif des montants dus à chaque enseignant",
        "Gestion des demandes de créneaux envoyées par les profs",
      ]}
    />
  );
}

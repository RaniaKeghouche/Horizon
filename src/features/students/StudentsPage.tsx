import FeaturePlaceholder from "../../components/FeaturePlaceholder";
import { useTranslation } from "react-i18next";

export default function StudentsPage() {
  const { t } = useTranslation();
  return (
    <FeaturePlaceholder
      icon="🎓"
      title={t("nav.students")}
      points={[
        "Formulaire d'inscription (nom, niveau, téléphone, parent, matières)",
        "Flux d'enrôlement : ajout à la classe + liste du prof + démarrage du suivi paiement",
        "Création / lien du compte étudiant-parent",
        "Listes filtrées par niveau, matière et statut",
      ]}
    />
  );
}

import FeaturePlaceholder from "../../components/FeaturePlaceholder";
import { useTranslation } from "react-i18next";

export default function PaymentsPage() {
  const { t } = useTranslation();
  return (
    <FeaturePlaceholder
      icon="💰"
      title={t("nav.payments")}
      points={[
        "Calcul automatique : part école (% ou fixe) et part enseignant",
        "Facturation multi-matières + total dû par étudiant",
        "Suivi de la dette au niveau de la séance (payé / impayé / reporté)",
        "Vue « séance X sur Y » pour l'étudiant/parent",
        "Règle de paiement à la 1re séance + relances WhatsApp/SMS + in-app automatiques",
        "Génération de factures PDF par étudiant",
      ]}
    />
  );
}

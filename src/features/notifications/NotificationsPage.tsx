import FeaturePlaceholder from "../../components/FeaturePlaceholder";
import { useTranslation } from "react-i18next";

export default function NotificationsPage() {
  const { t } = useTranslation();
  return (
    <FeaturePlaceholder
      icon="🔔"
      title={t("nav.notifications")}
      points={[
        "Notifications push FCM (présence, alertes de paiement)",
        "Digest quotidien « Aujourd'hui & Demain » envoyé à l'admin",
        "Relances de paiement récurrentes automatiques",
        "Notifications des demandes de créneaux des enseignants",
        "Liste des invités sur liste d'attente lorsqu'une place se libère",
      ]}
    />
  );
}

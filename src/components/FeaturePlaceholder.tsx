import { useTranslation } from "react-i18next";

/** Temporary content for feature pages whose UI is not built yet. */
export default function FeaturePlaceholder({
  icon,
  title,
  points,
}: {
  icon: string;
  title: string;
  points: string[];
}) {
  const { t } = useTranslation();
  return (
    <div className="card placeholder">
      <div className="placeholder-head">
        <span className="placeholder-icon">{icon}</span>
        <div>
          <h2>{title}</h2>
          <span className="badge badge-soft">{t("common.comingSoon")}</span>
        </div>
      </div>
      <ul className="placeholder-list">
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

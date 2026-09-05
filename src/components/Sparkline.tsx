/**
 * Courbe de tendance miniature.
 *
 * Tracée à la main : deux douzaines de pixels ne justifient pas d'embarquer une
 * librairie de graphes, et les séries sont déjà calculées par les pages.
 *
 * Elle ne dessine RIEN quand la série est vide ou entièrement à zéro : une
 * courbe plate inventée laisserait croire à une donnée qui n'existe pas.
 */
export default function Sparkline({
  values,
  tone = "var(--primary)",
  fill = true,
  className = "sparkline",
}: {
  values: number[];
  /** Couleur du trait (et du dégradé sous la courbe). */
  tone?: string;
  fill?: boolean;
  className?: string;
}) {
  if (values.length < 2 || values.every((v) => v === 0)) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const x = (i: number) => (i / (values.length - 1)) * 100;
  const y = (v: number) => 28 - ((v - min) / span) * 24;

  const line = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `0,32 ${line} 100,32`;

  return (
    <svg
      className={className}
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ color: tone }}
    >
      {fill && <polygon points={area} fill="currentColor" opacity="0.14" />}
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

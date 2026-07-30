// Dependency-free, theme-aware horizontal bar chart.
export interface Bar {
  label: string;
  value: number;
  color?: string; // CSS color; defaults to the brand gradient
}

export default function BarChart({
  data,
  format = (n) => String(n),
}: {
  data: Bar[];
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) return <p className="muted">Pas encore de données.</p>;
  return (
    <div className="bars">
      {data.map((d) => (
        <div className="bar-row" key={d.label}>
          <span className="bar-label" title={d.label}>{d.label}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: `${(d.value / max) * 100}%`,
                background: d.color,
              }}
            />
          </div>
          <span className="bar-value">{format(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

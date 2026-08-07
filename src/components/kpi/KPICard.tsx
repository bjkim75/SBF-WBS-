interface Props {
  title: string;
  value: number | string;
  description?: string;
}

export function KPICard({ title, value, description }: Props) {
  return (
    <div className="kpi-card">
      <h3 className="kpi-card__title">{title}</h3>
      <div className="kpi-card__value">{value}</div>
      {description && <p className="kpi-card__desc">{description}</p>}
    </div>
  );
}

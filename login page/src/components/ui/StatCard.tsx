interface StatCardProps {
  label: string;
  value: number | string;
  tone?: "default" | "success" | "warning" | "danger";
}

export default function StatCard({ label, value, tone = "default" }: StatCardProps) {
  return (
    <article className={`ui-stat-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

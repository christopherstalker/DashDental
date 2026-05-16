import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function MetricTile({
  icon: Icon,
  label,
  value,
  subtitle,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: ReactNode;
  value: ReactNode;
  subtitle?: ReactNode;
  tone?: "neutral" | "warning" | "danger";
}) {
  return (
    <div className={`metric-block ${tone}`}>
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
      {subtitle ? <small>{subtitle}</small> : null}
    </div>
  );
}

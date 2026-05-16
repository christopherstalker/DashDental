import type { ReactNode } from "react";

export function DetailList({
  items,
}: {
  items: Array<{ label: ReactNode; value: ReactNode }>;
}) {
  return (
    <div className="inspector-list">
      {items.map((item, index) => (
        <div className="info-line" key={index}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

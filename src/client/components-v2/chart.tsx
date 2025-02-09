import type React from "react";

// Add this new component to handle chart container styling
export function ChartContainer({
  className,
  children,
}: { className?: string; children: React.ReactNode }) {
  return <div className={className}>{children}</div>;
}

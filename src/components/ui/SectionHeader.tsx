import type { ReactNode } from "react";

export function SectionHeader({ title, count, action }: { title: string; count?: number; action?: ReactNode }) {
  return (
    <div className="flex h-8 items-center gap-2 px-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{title}</h2>
      {count ? <span className="text-[11px] tabular-nums text-muted/70">{count}</span> : null}
      <div className="ml-auto">{action}</div>
    </div>
  );
}

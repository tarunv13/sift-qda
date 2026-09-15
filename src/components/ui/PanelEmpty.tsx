import type { ReactNode } from "react";

import { Icon, type IconName } from "./Icon";

/** Designed empty state: a gently floating glyph, a title and one line of guidance. */
export function PanelEmpty({ icon, title, children }: { icon: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="animate-rise flex flex-col items-center px-8 py-14 text-center">
      <div className="animate-float mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-line bg-surface text-accent shadow-sm">
        <Icon name={icon} size={24} />
      </div>
      <p className="font-reading text-lg text-ink">{title}</p>
      {children ? <div className="mt-2 max-w-64 text-sm leading-relaxed text-muted">{children}</div> : null}
    </div>
  );
}

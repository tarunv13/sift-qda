import type { Source } from "../../lib/types";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

const KIND_NAME = { text: "Text", docx: "Word document", pdf: "PDF", xlsx: "Survey spreadsheet" } as const;

interface HeaderProps {
  source: Source;
  referenceCount: number;
  hasPage: boolean;
  showPage: boolean;
  onTogglePage: () => void;
  showStripes: boolean;
  onToggleStripes: () => void;
}

export function SourceHeader({ source, referenceCount, hasPage, showPage, onTogglePage, showStripes, onToggleStripes }: HeaderProps) {
  const words = source.content.trim() ? source.content.trim().split(/\s+/).length : 0;
  const details = [
    KIND_NAME[source.kind],
    `${words.toLocaleString()} words`,
    source.pages.length ? `${source.pages.length} pages` : null,
    typeof source.metadata.caseCount === "number" ? `${source.metadata.caseCount} cases` : null,
  ].filter(Boolean);

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line px-5">
      <h2 key={source.id} className="animate-rise truncate font-reading text-[17px] text-ink">
        {source.name}
      </h2>
      <span className="truncate text-xs text-muted">{details.join(" · ")}</span>
      <span className="ml-auto flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-accent">
        <Icon name="tag" size={12} />
        <span className="tabular-nums">{referenceCount}</span> coded
      </span>
      <Button
        size="sm"
        variant={showStripes ? "secondary" : "ghost"}
        onClick={onToggleStripes}
        aria-pressed={showStripes}
        data-tour="stripes"
        title="Show a named stripe beside the text for each coded passage"
      >
        <Icon name="chart" size={14} />
        Stripes
      </Button>
      {hasPage ? (
        <Button size="sm" variant={showPage ? "secondary" : "ghost"} onClick={onTogglePage} aria-pressed={showPage}>
          <Icon name="page" size={14} />
          Page view
        </Button>
      ) : null}
    </header>
  );
}

/** First thing seen in a project: where to start, and how coding works. */
export function EmptySource() {
  return (
    <main className="grid min-w-0 place-items-center px-10">
      <div className="animate-rise flex max-w-sm flex-col items-center text-center">
        <div className="animate-float relative mb-8 h-28 w-24">
          <div className="absolute inset-0 translate-x-3 -rotate-6 rounded-xl border border-line bg-panel" />
          <div className="absolute inset-0 space-y-2 rounded-xl border border-line bg-surface p-3.5 shadow-md">
            <div className="h-1.5 w-full rounded bg-line" />
            <div className="h-1.5 w-4/5 rounded bg-[color-mix(in_srgb,#c98500_45%,transparent)]" />
            <div className="h-1.5 w-full rounded bg-line" />
            <div className="h-1.5 w-3/5 rounded bg-[color-mix(in_srgb,#199e70_45%,transparent)]" />
            <div className="h-1.5 w-11/12 rounded bg-line" />
          </div>
        </div>
        <p className="font-reading text-2xl text-ink">Open a source to start coding</p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Select any passage, then attach a code. Passages can carry several codes at once, and everything you code
          gathers under that code on the right.
        </p>
        <p className="mt-6 flex items-center gap-2 text-xs font-medium text-accent">
          <Icon name="back" size={14} className="animate-nudge" />
          Pick or import a source in the sidebar
        </p>
      </div>
    </main>
  );
}

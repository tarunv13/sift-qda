import type { KeywordContext } from "../../lib/types";
import { PanelEmpty } from "../ui/PanelEmpty";

interface Props {
  word: string;
  contexts: KeywordContext[] | null;
  onOpen: (context: KeywordContext) => void;
}

/** Keyword in context: each occurrence with the words around it; click one to read it in its source. */
export function KeywordList({ word, contexts, onOpen }: Props) {
  if (!contexts) {
    return (
      <div className="space-y-2 p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-breathe h-16 rounded-lg bg-panel" />
        ))}
      </div>
    );
  }
  if (contexts.length === 0) {
    return (
      <PanelEmpty icon="search" title="No occurrences here">
        “{word}” does not appear in this scope.
      </PanelEmpty>
    );
  }
  return (
    <div className="p-4">
      <p className="mb-3 text-xs text-muted">
        {contexts.length >= 200 ? "First 200" : contexts.length} {contexts.length === 1 ? "occurrence" : "occurrences"}
      </p>
      <ul className="space-y-2">
        {contexts.map((c, i) => (
          <li key={`${c.sourceId}-${c.start}`} className="animate-rise" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
            <button
              type="button"
              onClick={() => onOpen(c)}
              className="block w-full rounded-lg border border-line bg-surface p-3 text-left shadow-sm transition-[transform,box-shadow] duration-200 ease-out-expo hover:-translate-y-px hover:shadow-md"
            >
              <span className="mb-1 block truncate text-xs text-muted">{c.sourceName}</span>
              <span className="font-reading text-[14px] leading-relaxed text-ink">
                …{c.before}
                <mark className="rounded-sm bg-accent-soft px-0.5 text-ink">{c.matched}</mark>
                {c.after}…
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

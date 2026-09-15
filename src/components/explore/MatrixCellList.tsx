import type { CellPassage } from "../../lib/types";
import { PanelEmpty } from "../ui/PanelEmpty";

interface Props {
  passages: CellPassage[] | null;
  onOpen: (passage: CellPassage) => void;
}

/** The passages behind a matrix cell. Each names its code beside the code's colour. */
export function MatrixCellList({ passages, onOpen }: Props) {
  if (!passages) {
    return (
      <div className="space-y-2 p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-breathe h-16 rounded-lg bg-panel" />
        ))}
      </div>
    );
  }
  if (passages.length === 0) {
    return <PanelEmpty icon="quote" title="No passages in this cell" />;
  }
  return (
    <ul className="space-y-2 p-4">
      {passages.map((p, i) => (
        <li key={`${p.sourceId}-${p.start}-${p.end}`} className="animate-rise" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
          <button
            type="button"
            onClick={() => onOpen(p)}
            className="block w-full rounded-lg border border-line bg-surface p-3 text-left shadow-sm transition-[transform,box-shadow] duration-200 ease-out-expo hover:-translate-y-px hover:shadow-md"
          >
            <span className="mb-1.5 flex items-center gap-2 text-xs text-muted">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
              <span className="truncate text-ink/85">{p.codeName}</span>
              <span className="ml-auto truncate">{p.sourceName}</span>
            </span>
            <span className="line-clamp-5 font-reading text-[14px] leading-relaxed whitespace-pre-line text-ink">{p.text}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

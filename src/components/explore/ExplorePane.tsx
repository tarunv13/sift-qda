import { useState } from "react";

import { ChartsPanel } from "./ChartsPanel";
import { MatrixPanel } from "./MatrixPanel";
import { QueryPanel } from "./QueryPanel";
import { WordsPanel } from "./WordsPanel";

const TABS = [
  { id: "words", label: "Word frequency" },
  { id: "matrix", label: "Matrix coding" },
  { id: "query", label: "Coding query" },
  { id: "charts", label: "Charts" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** The Explore view: patterns across the project, shown in place of the reader. */
export function ExplorePane() {
  const [tab, setTab] = useState<TabId>("words");
  return (
    <main className="flex min-h-0 min-w-0 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-line px-5">
        <h2 className="animate-rise font-reading text-[17px] text-ink">Explore</h2>
        <nav role="tablist" aria-label="Explore tools" className="flex h-full items-stretch gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              data-tour={`explore-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`relative px-2.5 text-sm transition-colors duration-150 ${tab === t.id ? "text-ink" : "text-muted hover:text-ink"}`}
            >
              {t.label}
              <span
                aria-hidden="true"
                className={`absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent transition-opacity duration-200 ${tab === t.id ? "opacity-100" : "opacity-0"}`}
              />
            </button>
          ))}
        </nav>
      </header>
      {/* Both tools stay mounted so switching tabs keeps each one's settings. */}
      <div role="tabpanel" hidden={tab !== "words"} className="flex min-h-0 flex-1 flex-col">
        <WordsPanel />
      </div>
      <div role="tabpanel" hidden={tab !== "matrix"} className="flex min-h-0 flex-1 flex-col">
        <MatrixPanel />
      </div>
      <div role="tabpanel" hidden={tab !== "query"} className="flex min-h-0 flex-1 flex-col">
        <QueryPanel />
      </div>
      <div role="tabpanel" hidden={tab !== "charts"} className="flex min-h-0 flex-1 flex-col">
        <ChartsPanel />
      </div>
    </main>
  );
}

import { Icon } from "../ui/Icon";
import { WordsPanel } from "./WordsPanel";

/** The Explore view: patterns across the project, shown in place of the reader. */
export function ExplorePane() {
  return (
    <main className="flex min-h-0 min-w-0 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line px-5">
        <h2 className="animate-rise font-reading text-[17px] text-ink">Explore</h2>
        <span className="flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-accent">
          <Icon name="chart" size={12} />
          Word frequency
        </span>
      </header>
      <WordsPanel />
    </main>
  );
}

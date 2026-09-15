import { useEffect, useRef, useState } from "react";

import { useProject } from "../../state/ProjectContext";
import { CasesTable } from "./CasesTable";
import { MemoPanel } from "./MemoPanel";
import { NodeReferences } from "./NodeReferences";
import { SearchPanel } from "./SearchPanel";

const TABS = [
  { id: "coded", label: "Coded" },
  { id: "search", label: "Search" },
  { id: "memos", label: "Memos" },
  { id: "cases", label: "Cases" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function RightPanel() {
  const { nodeId } = useProject();
  const [tab, setTab] = useState<TabId>("coded");
  const direction = useRef(1);
  const current = TABS.findIndex((t) => t.id === tab);

  function go(next: TabId) {
    const target = TABS.findIndex((t) => t.id === next);
    if (target === current) return;
    direction.current = target > current ? 1 : -1;
    setTab(next);
  }

  // Choosing a code anywhere brings its references into view.
  useEffect(() => {
    if (nodeId !== null) go("coded");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  return (
    <aside className="flex min-h-0 flex-col border-l border-line bg-panel/40">
      <nav className="relative flex h-12 shrink-0 items-stretch border-b border-line px-2" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            data-tour={`tab-${t.id}`}
            aria-selected={t.id === tab}
            onClick={() => go(t.id)}
            className={`flex-1 text-sm transition-colors duration-150 ${t.id === tab ? "text-ink" : "text-muted hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-2 h-0.5 rounded-full bg-accent transition-transform duration-300 ease-out-expo"
          style={{ width: `calc((100% - 1rem) / ${TABS.length})`, transform: `translateX(${current * 100}%)` }}
        />
      </nav>
      <div
        key={tab}
        role="tabpanel"
        className={`min-h-0 flex-1 overflow-y-auto ${direction.current > 0 ? "animate-from-right" : "animate-from-left"}`}
      >
        {tab === "coded" ? <NodeReferences /> : null}
        {tab === "search" ? <SearchPanel /> : null}
        {tab === "memos" ? <MemoPanel /> : null}
        {tab === "cases" ? <CasesTable /> : null}
      </div>
    </aside>
  );
}

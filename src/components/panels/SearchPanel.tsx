import { useState, type FormEvent } from "react";

import { api, errorMessage } from "../../lib/api";
import type { SearchHit } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";
import { Icon } from "../ui/Icon";
import { PanelEmpty } from "../ui/PanelEmpty";

type Mode = "meaning" | "exact";

export function SearchPanel() {
  const { project, reveal } = useProject();
  const [mode, setMode] = useState<Mode>("meaning");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function search(event?: FormEvent, override?: Mode) {
    event?.preventDefault();
    const using = override ?? mode;
    if (!project || !query.trim()) return;
    setBusy(true);
    setError(null);
    try {
      setHits(using === "meaning" ? await api.semanticSearch(project.id, query) : await api.textSearch(project.id, query));
    } catch (e) {
      setHits(null);
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    if (query.trim()) void search(undefined, next);
  }

  return (
    <div className="p-4">
      <form onSubmit={search} className="relative">
        <Icon name="search" size={15} className={`absolute top-1/2 left-3 -translate-y-1/2 text-muted ${busy ? "animate-breathe" : ""}`} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={mode === "meaning" ? "Search by meaning, e.g. climate anxiety" : "Find an exact phrase"}
          aria-label="Search query"
          className="h-10 w-full rounded-xl border border-line bg-surface pr-3 pl-9 text-sm text-ink shadow-sm outline-none focus:ring-2 focus:ring-accent/40"
        />
      </form>
      <div className="relative mt-2 grid grid-cols-2 rounded-lg bg-line/50 p-0.5 text-xs" role="radiogroup" aria-label="Search mode">
        <span
          aria-hidden="true"
          className="absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-md bg-surface shadow-sm transition-transform duration-300 ease-out-expo"
          style={{ transform: mode === "exact" ? "translateX(100%)" : undefined }}
        />
        {(["meaning", "exact"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => switchMode(m)}
            className={`relative h-7 transition-colors ${mode === m ? "text-ink" : "text-muted"}`}
          >
            {m === "meaning" ? "By meaning" : "Exact words"}
          </button>
        ))}
      </div>

      {error ? (
        <div className="animate-rise mt-4 rounded-xl border border-warn/30 bg-warn/10 p-3 text-sm leading-relaxed text-ink">
          <p>{error}</p>
          {mode === "meaning" ? (
            <button type="button" onClick={() => switchMode("exact")} className="mt-2 font-medium text-accent hover:underline">
              Search the exact words instead →
            </button>
          ) : null}
        </div>
      ) : hits === null ? (
        <PanelEmpty icon="sparkle" title="Ask your data">
          Meaning search finds related passages even when they use different words. It runs entirely on this computer.
        </PanelEmpty>
      ) : hits.length === 0 ? (
        <PanelEmpty icon="search" title="No passages found">
          Try broader wording{mode === "exact" ? ", or search by meaning" : ""}.
        </PanelEmpty>
      ) : (
        <ul className="mt-4 space-y-2">
          <li className="text-xs text-muted">
            {hits.length} {hits.length === 1 ? "passage" : "passages"}
          </li>
          {hits.map((hit, i) => (
            <li key={`${hit.sourceId}-${hit.start}`} className="animate-rise" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
              <button
                type="button"
                onClick={() => reveal(hit.sourceId, hit.start, hit.end)}
                className="block w-full rounded-lg border border-line bg-surface p-3 text-left shadow-sm transition-[transform,box-shadow] duration-200 ease-out-expo hover:-translate-y-px hover:shadow-md"
              >
                <span className="mb-1.5 flex items-center gap-2 text-xs text-muted">
                  <span className="truncate">{hit.sourceName}</span>
                  {mode === "meaning" ? (
                    <span className="ml-auto h-1 w-12 shrink-0 overflow-hidden rounded-full bg-line" title={`Similarity ${Math.round(hit.score * 100)}%`}>
                      <span className="block h-full bg-accent" style={{ width: `${Math.max(8, hit.score * 100)}%` }} />
                    </span>
                  ) : null}
                </span>
                <span className="line-clamp-4 font-reading text-[14px] leading-relaxed text-ink">
                  {mode === "exact" ? <Highlighted text={hit.snippet} term={query.trim()} /> : hit.snippet}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Highlighted({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    <>
      {text.split(new RegExp(`(${escaped})`, "gi")).map((part, i) =>
        i % 2 ? (
          <mark key={i} className="rounded-sm bg-accent-soft px-0.5 text-ink">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

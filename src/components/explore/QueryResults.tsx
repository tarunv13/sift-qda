import { useMemo } from "react";

import type { QueryHit } from "../../lib/types";

interface Props {
  hits: QueryHit[];
  onOpen: (hit: QueryHit) => void;
}

/** Query results grouped by source; click one to read it in place. */
export function QueryResults({ hits, onOpen }: Props) {
  const groups = useMemo(() => {
    const map = new Map<number, { name: string; items: QueryHit[] }>();
    for (const hit of hits) {
      const group = map.get(hit.sourceId) ?? { name: hit.sourceName, items: [] };
      group.items.push(hit);
      map.set(hit.sourceId, group);
    }
    return [...map.entries()];
  }, [hits]);

  return (
    <div className="space-y-5">
      {groups.map(([sourceId, { name, items }]) => (
        <section key={sourceId}>
          <h3 className="mb-2 flex items-center gap-2 text-xs font-medium text-muted">
            <span className="truncate">{name}</span>
            <span className="tabular-nums text-muted/70">{items.length}</span>
          </h3>
          <ul className="space-y-2">
            {items.map((hit, i) => (
              <li key={`${hit.start}-${hit.end}`} className="animate-rise" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
                <button
                  type="button"
                  onClick={() => onOpen(hit)}
                  className="block w-full rounded-lg border border-line bg-surface p-3 text-left shadow-sm transition-[transform,box-shadow] duration-200 ease-out-expo hover:-translate-y-px hover:shadow-md"
                >
                  <span className="line-clamp-5 font-reading text-[14px] leading-relaxed whitespace-pre-line text-ink">{hit.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

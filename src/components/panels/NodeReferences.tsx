import { useEffect, useMemo, useState } from "react";

import { api } from "../../lib/api";
import type { QuotedReference } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";
import { Icon } from "../ui/Icon";
import { PanelEmpty } from "../ui/PanelEmpty";
import { NodeDetails } from "./NodeDetails";

/** Everything coded at the selected code, grouped by source. */
export function NodeReferences() {
  const { nodes, nodeId, referencesVersion, referencesChanged, reveal, run } = useProject();
  const node = nodes.find((n) => n.id === nodeId);
  const [refs, setRefs] = useState<QuotedReference[] | null>(null);

  useEffect(() => {
    if (nodeId === null) return setRefs(null);
    let live = true;
    void run(api.listNodeReferences(nodeId)).then((items) => live && setRefs(items ?? []));
    return () => {
      live = false;
    };
  }, [nodeId, referencesVersion, run]);

  const groups = useMemo(() => {
    const map = new Map<string, QuotedReference[]>();
    for (const r of refs ?? []) map.set(r.sourceName, [...(map.get(r.sourceName) ?? []), r]);
    return [...map.entries()];
  }, [refs]);

  if (!node) {
    return (
      <PanelEmpty icon="tag" title="No code selected">
        Choose a code in the sidebar, or click highlighted text, to read every passage coded there.
      </PanelEmpty>
    );
  }

  async function uncode(reference: QuotedReference) {
    if (await run(api.deleteCodingReference(reference.id).then(() => true))) referencesChanged();
  }

  return (
    <div className="p-4">
      <NodeDetails key={node.id} node={node} />
      {refs === null ? null : refs.length === 0 ? (
        <PanelEmpty icon="quote" title="Nothing coded yet">
          Select a passage in any source and attach “{node.name}”.
        </PanelEmpty>
      ) : (
        groups.map(([sourceName, items]) => (
          <section key={sourceName} className="mt-5">
            <h3 className="mb-2 flex items-center gap-2 text-xs font-medium text-muted">
              <span className="truncate">{sourceName}</span>
              <span className="tabular-nums text-muted/70">{items.length}</span>
            </h3>
            <ul className="space-y-2">
              {items.map((r, i) => (
                <li key={r.id} className="group animate-rise relative" style={{ animationDelay: `${i * 30}ms` }}>
                  <button
                    type="button"
                    onClick={() => reveal(r.sourceId, r.startIndex, r.endIndex)}
                    className="block w-full rounded-lg border border-line bg-surface py-2.5 pr-8 pl-3 text-left shadow-sm transition-[transform,box-shadow] duration-200 ease-out-expo hover:-translate-y-px hover:shadow-md"
                    style={{ borderLeft: `3px solid ${node.color}` }}
                  >
                    <span className="line-clamp-5 font-reading text-[14px] leading-relaxed whitespace-pre-line text-ink">{r.text}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => uncode(r)}
                    aria-label="Remove this coding"
                    title="Uncode"
                    className="absolute top-2 right-2 rounded p-1 text-muted opacity-0 transition-[opacity,color] group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
                  >
                    <Icon name="x" size={13} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

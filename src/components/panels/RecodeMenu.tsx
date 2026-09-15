import { useMemo, useState } from "react";

import { api } from "../../lib/api";
import { codeOptions } from "../../lib/codePaths";
import type { CodeNode, QuotedReference } from "../../lib/types";
import { undo } from "../../lib/undo";
import { useProject } from "../../state/ProjectContext";
import { Icon } from "../ui/Icon";

/** Moves one coded passage to a different code. */
export function RecodeMenu({ reference, node }: { reference: QuotedReference; node: CodeNode }) {
  const { nodes, run, referencesChanged, notify } = useProject();
  const [open, setOpen] = useState(false);
  const options = useMemo(() => codeOptions(nodes).filter((o) => o.id !== node.id), [nodes, node.id]);

  async function recode(targetId: number) {
    setOpen(false);
    const target = nodes.find((n) => n.id === targetId);
    if (!target) return;
    const wasCodedThere = await run(api.recodeReference(reference.id, targetId));
    if (wasCodedThere === undefined) return;
    const { sourceId, startIndex, endIndex } = reference;
    undo.push(`moving a passage to “${target.name}”`, () =>
      wasCodedThere ? api.saveCodingReference(sourceId, startIndex, endIndex, node.id) : api.recodeReference(reference.id, node.id),
    );
    referencesChanged();
    notify(wasCodedThere ? `That passage was already coded at “${target.name}”, so it was removed from “${node.name}”.` : `Moved the passage to “${target.name}”.`, "success");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Move to another code"
        aria-expanded={open}
        title="Move to another code"
        className="absolute top-2 right-8 rounded p-1 text-muted opacity-0 transition-[opacity,color] group-hover:opacity-100 hover:text-ink focus-visible:opacity-100"
      >
        <Icon name="tag" size={13} />
      </button>
      {open ? (
        <select
          autoFocus
          defaultValue=""
          onChange={(e) => void recode(Number(e.target.value))}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          aria-label="Move this passage to"
          className="animate-rise mt-1.5 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="" disabled>
            Move this passage to…
          </option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      ) : null}
    </>
  );
}

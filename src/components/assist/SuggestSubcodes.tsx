import { useEffect, useState } from "react";

import { api } from "../../lib/api";
import type { CodeSuggestion } from "../../lib/assistTypes";
import { nextColor } from "../../lib/colors";
import type { CodeNode } from "../../lib/types";
import { undo } from "../../lib/undo";
import { useProject } from "../../state/ProjectContext";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

/** Asks the local model for sub-codes of a code; each can be added with one click. */
export function SuggestSubcodes({ node }: { node: CodeNode }) {
  const { project, nodes, run, referencesChanged } = useProject();
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<CodeSuggestion[] | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setItems(null);
    setAdded(new Set());
  }, [node.id]);

  async function suggest() {
    setBusy(true);
    const found = await run(api.aiSuggestSubcodes(node.id));
    setBusy(false);
    if (found) setItems(found);
  }

  async function add(suggestion: CodeSuggestion) {
    if (!project) return;
    const color = nextColor(nodes.map((n) => n.color));
    const created = await run(api.createNode(project.id, suggestion.name, color, node.id, suggestion.description));
    if (!created) return;
    setAdded((prev) => new Set(prev).add(suggestion.name));
    undo.push(`adding “${created.name}”`, () => api.deleteNode(created.id));
    referencesChanged();
  }

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={suggest}
        disabled={busy || node.referenceCount === 0}
        aria-busy={busy}
        className="w-full justify-center"
        title={node.referenceCount === 0 ? "Code some passages first" : "Runs on this computer through Ollama"}
      >
        <Icon name="sparkle" size={13} className={busy ? "animate-breathe text-accent" : ""} />
        {busy ? `Reading ${node.referenceCount} passages…` : items ? "Suggest again" : "Suggest sub-codes"}
      </Button>
      {items ? (
        items.length === 0 ? (
          <p className="animate-rise px-1 text-xs text-muted">No new sub-codes came back. Try again after coding more passages.</p>
        ) : (
          <ul className="animate-rise space-y-1.5">
            {items.map((s) => (
              <li key={s.name} className="flex items-start gap-2 rounded-md bg-paper px-2.5 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">{s.name}</p>
                  {s.description ? <p className="mt-0.5 text-xs leading-relaxed text-muted">{s.description}</p> : null}
                </div>
                {added.has(s.name) ? (
                  <span className="flex items-center gap-1 pt-0.5 text-xs text-accent">
                    <Icon name="check" size={12} />
                    Added
                  </span>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => add(s)} aria-label={`Add sub-code ${s.name}`}>
                    Add
                  </Button>
                )}
              </li>
            ))}
            <li className="px-1 text-[11px] leading-relaxed text-muted">
              Drafted by your local model from this code's passages. Keep only what fits your analysis.
            </li>
          </ul>
        )
      ) : null}
    </div>
  );
}

import { ask } from "@tauri-apps/plugin-dialog";
import { useMemo } from "react";

import { api } from "../../lib/api";
import { codeOptions } from "../../lib/codePaths";
import type { CodeNode } from "../../lib/types";
import { undo } from "../../lib/undo";
import { useProject } from "../../state/ProjectContext";
import { subtreeOf, useMoveCode } from "../sidebar/useMoveCode";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

const SELECT =
  "min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:ring-2 focus:ring-accent/30";

/** Codebook housekeeping for the selected code: move it, merge it, or start a memo on it. */
export function NodeActions({ node }: { node: CodeNode }) {
  const { project, nodes, run, referencesChanged, selectNode, notify } = useProject();
  const move = useMoveCode();
  // A code can't go inside itself or its own sub-codes.
  const targets = useMemo(() => {
    const own = subtreeOf(nodes, node.id);
    return codeOptions(nodes).filter((o) => !own.has(o.id));
  }, [nodes, node.id]);

  async function merge(intoId: number) {
    const into = nodes.find((n) => n.id === intoId);
    if (!into) return;
    const detail = `Its ${node.referenceCount} coded passages, sub-codes and memos move to “${into.name}”, and “${node.name}” is deleted. This can't be undone.`;
    if (!(await ask(`Merge “${node.name}” into “${into.name}”?\n\n${detail}`, { title: "Merge codes", kind: "warning" }))) return;
    const moved = await run(api.mergeNodes(node.id, intoId));
    if (moved === undefined) return;
    undo.clear();
    selectNode(intoId);
    referencesChanged();
    notify(`Merged into “${into.name}”: ${moved} ${moved === 1 ? "passage" : "passages"} moved.`, "success");
  }

  async function newMemo() {
    if (!project) return;
    const memo = await run(api.createMemo(project.id, `Memo on ${node.name}`, null, node.id));
    if (memo) notify(`Memo “${memo.title}” created. Open it from the Memos tab.`, "success");
  }

  return (
    <div className="animate-rise mt-3 space-y-2 rounded-lg border border-line bg-surface/60 p-2.5">
      <label className="flex items-center gap-2 text-xs text-muted">
        <span className="w-16 shrink-0">Inside</span>
        <select
          value={node.parentId ?? ""}
          onChange={(e) => void move(node, e.target.value === "" ? null : Number(e.target.value))}
          className={SELECT}
        >
          <option value="">Top level</option>
          {targets.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs text-muted">
        <span className="w-16 shrink-0">Merge into</span>
        <select value="" onChange={(e) => void merge(Number(e.target.value))} className={SELECT}>
          <option value="" disabled>
            Choose a code…
          </option>
          {targets.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <Button size="sm" variant="ghost" onClick={newMemo} className="w-full justify-center">
        <Icon name="note" size={13} />
        New memo on this code
      </Button>
    </div>
  );
}

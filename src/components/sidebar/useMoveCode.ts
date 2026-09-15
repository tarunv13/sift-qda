import { useCallback } from "react";

import { api } from "../../lib/api";
import type { CodeNode } from "../../lib/types";
import { undo } from "../../lib/undo";
import { useProject } from "../../state/ProjectContext";

/** A code and every code nested below it. */
export function subtreeOf(nodes: CodeNode[], id: number): Set<number> {
  const found = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const node of nodes) {
      if (node.parentId !== null && found.has(node.parentId) && !found.has(node.id)) {
        found.add(node.id);
        grew = true;
      }
    }
  }
  return found;
}

/** Whether `code` can be placed under `parentId` (null is the top level). */
export function canMove(nodes: CodeNode[], code: CodeNode, parentId: number | null): boolean {
  if (parentId === code.parentId) return false;
  return parentId === null || !subtreeOf(nodes, code.id).has(parentId);
}

/** Moves a code under another (or to the top level), undoably. */
export function useMoveCode() {
  const { nodes, run, referencesChanged, notify } = useProject();

  return useCallback(
    async (code: CodeNode, parentId: number | null) => {
      if (!canMove(nodes, code, parentId)) return;
      const moved = await run(api.updateNode({ ...code, parentId }));
      if (!moved) return;
      const parent = nodes.find((n) => n.id === parentId);
      undo.push(`moving “${code.name}”`, () => api.updateNode(code));
      referencesChanged();
      notify(parent ? `Moved “${code.name}” under “${parent.name}”.` : `Moved “${code.name}” to the top level.`, "success");
    },
    [nodes, run, referencesChanged, notify],
  );
}

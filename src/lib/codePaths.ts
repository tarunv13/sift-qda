import type { CodeNode } from "./types";

/** Every code labelled "Theme › Code", sorted, for pickers. */
export function codeOptions(nodes: CodeNode[]): { id: number; label: string }[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const path = (node: CodeNode) => {
    const parts = [node.name];
    let parent = node.parentId !== null ? byId.get(node.parentId) : undefined;
    while (parent && parts.length < 64) {
      parts.unshift(parent.name);
      parent = parent.parentId !== null ? byId.get(parent.parentId) : undefined;
    }
    return parts.join(" › ");
  };
  return nodes.map((n) => ({ id: n.id, label: path(n) })).sort((a, b) => a.label.localeCompare(b.label));
}

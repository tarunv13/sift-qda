import type { CodeNode } from "./types";

export interface TreeDatum {
  id: number;
  name: string;
  /** Passages coded here plus everything coded beneath. */
  value: number;
  /** Passages coded directly at this code. */
  own: number;
  color: string;
  children?: TreeDatum[];
}

/** The code tree with rolled-up counts. Codes with nothing coded at or beneath them are left out. */
export function codeTree(nodes: CodeNode[]): { roots: TreeDatum[]; hidden: number } {
  const children = new Map<number | null, CodeNode[]>();
  for (const node of nodes) children.set(node.parentId, [...(children.get(node.parentId) ?? []), node]);

  let kept = 0;
  const build = (node: CodeNode, depth: number): TreeDatum | null => {
    const kids = depth < 32 ? (children.get(node.id) ?? []).map((k) => build(k, depth + 1)).filter((k): k is TreeDatum => k !== null) : [];
    const value = node.referenceCount + kids.reduce((sum, k) => sum + k.value, 0);
    if (value === 0) return null;
    kept++;
    return { id: node.id, name: node.name, value, own: node.referenceCount, color: node.color, children: kids.length ? kids : undefined };
  };

  const roots = (children.get(null) ?? []).map((n) => build(n, 0)).filter((n): n is TreeDatum => n !== null);
  roots.sort((a, b) => b.value - a.value);
  return { roots, hidden: nodes.length - kept };
}

/** Flattened rows for the table view, each with its full path. */
export function treeRows(roots: TreeDatum[]): { id: number; path: string; own: number; total: number; color: string }[] {
  const rows: { id: number; path: string; own: number; total: number; color: string }[] = [];
  const walk = (node: TreeDatum, prefix: string) => {
    const path = prefix ? `${prefix} › ${node.name}` : node.name;
    rows.push({ id: node.id, path, own: node.own, total: node.value, color: node.color });
    node.children?.forEach((child) => walk(child, path));
  };
  roots.forEach((root) => walk(root, ""));
  return rows;
}

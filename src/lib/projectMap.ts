// Turns a coding matrix and the code tree into a node-and-link map of the project:
// codes joined to the sources or cases they are coded in, and to the codes they sit under.
import type { CodeNode, CodingMatrix } from "./types";

export interface MapNode {
  kind: "code" | "place";
  /** A code's id, or a column's position in the matrix. */
  id: number;
  /** Short label drawn on the map. */
  name: string;
  /** Full code path, or the source or case name. */
  path: string;
  color: string;
  /** Coded passages at this code, or in this source or case. */
  value: number;
  /** Sources behind a place; empty for a code. */
  sourceIds: number[];
}

export interface MapLink {
  /** Positions in `nodes`, the form ECharts links use. */
  from: number;
  to: number;
  value: number;
  color: string;
  /** A sub-code under its parent, rather than a code coded in a place. */
  nested: boolean;
}

export interface ProjectMap {
  nodes: MapNode[];
  links: MapLink[];
  /** Codes left out because nothing is coded at or beneath them. */
  hidden: number;
  /** Largest node value, for scaling. */
  peak: number;
}

/** Passages at each code plus everything coded beneath it. */
function rollUp(matrix: CodingMatrix, parentOf: Map<number, number | null>): Map<number, number> {
  const totals = new Map<number, number>();
  for (const row of matrix.rows) {
    let id: number | null = row.id;
    for (let depth = 0; id !== null && depth < 32; depth++) {
      totals.set(id, (totals.get(id) ?? 0) + row.total);
      id = parentOf.get(id) ?? null;
    }
  }
  return totals;
}

const leaf = (path: string) => path.split("›").pop()?.trim() ?? path;

/**
 * `matrix` supplies the counts, `codes` the nesting. With `showEmpty` off, codes with nothing
 * coded at or beneath them and places with nothing coded are left out.
 */
export function projectMap(matrix: CodingMatrix, codes: CodeNode[], showEmpty: boolean): ProjectMap {
  const parentOf = new Map(codes.map((code) => [code.id, code.parentId]));
  const totals = rollUp(matrix, parentOf);

  const nodes: MapNode[] = [];
  const codeAt = new Map<number, number>();
  const rowAt = new Map<number, number>();
  matrix.rows.forEach((row, r) => {
    if (!showEmpty && (totals.get(row.id) ?? 0) === 0) return;
    rowAt.set(r, nodes.length);
    codeAt.set(row.id, nodes.length);
    nodes.push({ kind: "code", id: row.id, name: leaf(row.label), path: row.label, color: row.color, value: row.total, sourceIds: [] });
  });

  const placeAt = new Map<number, number>();
  matrix.columns.forEach((column, c) => {
    if (!showEmpty && column.total === 0) return;
    placeAt.set(c, nodes.length);
    nodes.push({ kind: "place", id: c, name: column.label, path: column.label, color: "", value: column.total, sourceIds: column.sourceIds });
  });

  const links: MapLink[] = [];
  matrix.rows.forEach((row, r) => {
    const from = rowAt.get(r);
    if (from === undefined) return;
    const parent = parentOf.get(row.id) ?? null;
    const above = parent === null ? undefined : codeAt.get(parent);
    if (above !== undefined) links.push({ from: above, to: from, value: totals.get(row.id) ?? 0, color: row.color, nested: true });
    matrix.cells[r].forEach((count, c) => {
      const to = placeAt.get(c);
      if (to !== undefined && count > 0) links.push({ from, to, value: count, color: row.color, nested: false });
    });
  });

  let peak = 1;
  for (const node of nodes) peak = Math.max(peak, node.value);
  return { nodes, links, hidden: matrix.rows.length - rowAt.size, peak };
}

export interface MapRow {
  id: number;
  path: string;
  color: string;
  total: number;
  /** Where its passages are, most first, as "Interview 3 (4)". */
  places: string;
}

/** The same map as rows, so the counts are readable without colour or a mouse. */
export function mapRows(map: ProjectMap): MapRow[] {
  const found = new Map<number, { label: string; count: number }[]>();
  for (const link of map.links) {
    if (link.nested) continue;
    const list = found.get(link.from) ?? [];
    list.push({ label: map.nodes[link.to].name, count: link.value });
    found.set(link.from, list);
  }
  return map.nodes
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => node.kind === "code")
    .map(({ node, index }) => {
      const places = (found.get(index) ?? []).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
      return {
        id: node.id,
        path: node.path,
        color: node.color,
        total: node.value,
        places: places.map((p) => `${p.label} (${p.count})`).join(", "),
      };
    });
}

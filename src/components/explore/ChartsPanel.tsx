import { useEffect, useMemo, useState } from "react";

import { api } from "../../lib/api";
import { codeTree, treeRows } from "../../lib/codeTree";
import type { CodingMatrix } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";
import { PanelEmpty } from "../ui/PanelEmpty";
import { CodeHierarchyChart, type HierarchyStyle } from "./CodeHierarchyChart";
import { SourceBarsChart } from "./SourceBarsChart";

type Chart = "hierarchy" | "sources";
type Mode = HierarchyStyle | "bars" | "table";

const FIELD = "h-8 rounded-lg border border-line bg-surface px-2 text-xs text-ink outline-none focus:ring-2 focus:ring-accent/40";

/** Charts of the codebook: the code hierarchy by size, and one code across sources. */
export function ChartsPanel() {
  const { project, nodes, selectNode, referencesVersion, run } = useProject();
  const [chart, setChart] = useState<Chart>("hierarchy");
  const [mode, setMode] = useState<Mode>("treemap");
  const [matrix, setMatrix] = useState<CodingMatrix | null>(null);
  const [row, setRow] = useState(0);

  const tree = useMemo(() => codeTree(nodes), [nodes]);

  useEffect(() => {
    if (!project || chart !== "sources") return;
    void run(api.codingMatrix(project.id, { themesOnly: false, columns: { kind: "sources" } })).then((m) => m && setMatrix(m));
  }, [project, chart, referencesVersion, run]);

  const modes: Mode[] = chart === "hierarchy" ? ["treemap", "sunburst", "table"] : ["bars", "table"];
  const current = modes.includes(mode) ? mode : modes[0];
  const picked = matrix?.rows[row] ? matrix.rows[row] : matrix?.rows[0];
  const bars = picked && matrix ? matrix.columns.map((c, i) => ({ label: c.label, value: matrix.cells[matrix.rows.indexOf(picked)][i] })) : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3 text-xs text-muted">
        <label className="flex items-center gap-1.5">
          Chart
          <select value={chart} onChange={(e) => setChart(e.target.value as Chart)} className={FIELD}>
            <option value="hierarchy">Code hierarchy</option>
            <option value="sources">One code across sources</option>
          </select>
        </label>
        {chart === "sources" && matrix ? (
          <label className="flex items-center gap-1.5">
            Code
            <select value={picked ? matrix.rows.indexOf(picked) : 0} onChange={(e) => setRow(Number(e.target.value))} className={`${FIELD} max-w-64`}>
              {matrix.rows.map((r, i) => (
                <option key={r.id} value={i}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div role="radiogroup" aria-label="Show as" className="ml-auto flex rounded-lg bg-line/50 p-0.5">
          {modes.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={current === m}
              onClick={() => setMode(m)}
              className={`h-7 rounded-md px-3 capitalize transition-[background-color,color] duration-150 ${current === m ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <section className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {chart === "hierarchy" ? (
          tree.roots.length === 0 ? (
            <PanelEmpty icon="chart" title="Nothing coded yet">Code some passages and your codebook appears here, sized by how much is coded.</PanelEmpty>
          ) : (
            <>
              <p className="mb-3 text-xs text-muted">
                Size is coded passages, including sub-codes. Click a code to read its passages.
                {tree.hidden ? ` ${tree.hidden} ${tree.hidden === 1 ? "code has" : "codes have"} nothing coded and ${tree.hidden === 1 ? "is" : "are"} left out.` : ""}
              </p>
              {current === "table" ? (
                <SimpleTable
                  head={["Code", "Coded directly", "Including sub-codes"]}
                  rows={treeRows(tree.roots).map((r) => ({ key: r.id, color: r.color, cells: [r.path, r.own, r.total], onClick: () => selectNode(r.id) }))}
                />
              ) : (
                <CodeHierarchyChart roots={tree.roots} style={current as HierarchyStyle} onSelect={selectNode} />
              )}
            </>
          )
        ) : !matrix || !picked ? (
          <PanelEmpty icon="chart" title="No codes yet">Create and apply codes to compare them across sources.</PanelEmpty>
        ) : current === "table" ? (
          <SimpleTable head={["Source", "Passages"]} rows={bars.map((b, i) => ({ key: i, cells: [b.label, b.value] }))} />
        ) : (
          <SourceBarsChart code={picked} bars={bars} />
        )}
      </section>
    </div>
  );
}

interface TableRow {
  key: number;
  cells: (string | number)[];
  color?: string;
  onClick?: () => void;
}

function SimpleTable({ head, rows }: { head: string[]; rows: TableRow[] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-line text-left text-xs text-muted">
          {head.map((h, i) => (
            <th key={h} className={`py-2 pr-3 font-medium ${i ? "text-right" : ""}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-b border-line/60">
            {row.cells.map((cell, i) => (
              <td key={i} className={`py-1.5 pr-3 ${i ? "text-right tabular-nums text-ink" : "text-ink"}`}>
                {i === 0 && row.onClick ? (
                  <button type="button" onClick={row.onClick} className="flex items-center gap-2 text-left hover:text-accent">
                    {row.color ? <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} /> : null}
                    {cell}
                  </button>
                ) : (
                  cell
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

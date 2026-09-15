import { save } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";

import { api } from "../../lib/api";
import type { CaseTable, CellPassage, CodingMatrix, MatrixSpec } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { PanelEmpty } from "../ui/PanelEmpty";
import { MatrixCellList } from "./MatrixCellList";
import { MatrixControls, type MatrixView } from "./MatrixControls";
import { MatrixHeatmap } from "./MatrixHeatmap";
import { MatrixTable } from "./MatrixTable";

/** Matrix coding: codes or themes against sources, cases or attribute values. */
export function MatrixPanel() {
  const { project, reveal, run, notify, referencesVersion } = useProject();
  const [spec, setSpec] = useState<MatrixSpec>({ themesOnly: false, columns: { kind: "sources" } });
  const [view, setView] = useState<MatrixView>("heatmap");
  const [attributes, setAttributes] = useState<CaseTable["attributes"]>([]);
  const [matrix, setMatrix] = useState<CodingMatrix | null>(null);
  const [loading, setLoading] = useState(false);
  const [cell, setCell] = useState<{ row: number; column: number } | null>(null);
  const [passages, setPassages] = useState<CellPassage[] | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!project) return;
    void run(api.getCaseTable(project.id)).then((table) => table && setAttributes(table.attributes));
  }, [project, run]);

  useEffect(() => {
    if (!project) return;
    let live = true;
    setLoading(true);
    setCell(null);
    void run(api.codingMatrix(project.id, spec)).then((result) => {
      if (!live) return;
      if (result) setMatrix(result);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [project, spec, referencesVersion, run]);

  useEffect(() => {
    if (!project || !matrix || !cell) return;
    let live = true;
    setPassages(null);
    const row = matrix.rows[cell.row];
    const column = matrix.columns[cell.column];
    void run(api.matrixCellPassages(project.id, row.id, matrix.themesOnly, column.sourceIds)).then((result) => {
      if (live && result) setPassages(result);
    });
    return () => {
      live = false;
    };
  }, [project, matrix, cell, run]);

  async function exportExcel() {
    if (!project) return;
    const path = await save({ defaultPath: `${project.name} - coding matrix.xlsx`, filters: [{ name: "Excel workbook", extensions: ["xlsx"] }] });
    if (!path) return;
    setExporting(true);
    if (await run(api.exportMatrixExcel(project.id, spec, path).then(() => true))) notify("Saved the coding matrix with row and column totals.", "success");
    setExporting(false);
  }

  const selected = matrix && cell ? `${matrix.rows[cell.row].label} × ${matrix.columns[cell.column].label}` : "";
  const empty = matrix && (matrix.rows.length === 0 || matrix.columns.length === 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MatrixControls spec={spec} onSpec={setSpec} attributes={attributes} view={view} onView={setView} onExport={exportExcel} exporting={exporting} />
      <div className="flex min-h-0 flex-1">
        <section className={`min-w-0 flex-1 overflow-auto px-5 py-4 transition-opacity duration-200 ${loading && matrix ? "opacity-60" : ""}`}>
          {matrix && matrix.unlinkedCases > 0 && spec.columns.kind !== "sources" ? (
            <p className="mb-3 text-xs text-muted">
              {matrix.unlinkedCases} {matrix.unlinkedCases === 1 ? "case isn't" : "cases aren't"} linked to a source, so {matrix.unlinkedCases === 1 ? "it isn't" : "they aren't"} counted.
            </p>
          ) : null}
          {matrix && !empty ? <p className="mb-3 text-xs text-muted">Numbers are coded passages. Click a cell to read them.</p> : null}
          {!matrix ? (
            <div className="animate-breathe h-72 rounded-xl bg-panel" />
          ) : empty ? (
            <PanelEmpty icon="table" title="Nothing to compare yet">
              {matrix.rows.length === 0 ? "Create codes and code some passages first." : "No sources or linked cases for these columns."}
            </PanelEmpty>
          ) : view === "heatmap" ? (
            <MatrixHeatmap matrix={matrix} onSelect={(row, column) => setCell({ row, column })} />
          ) : (
            <MatrixTable matrix={matrix} onSelect={(row, column) => setCell({ row, column })} />
          )}
        </section>
        {cell && matrix ? (
          <aside className="animate-from-right flex w-[340px] shrink-0 flex-col border-l border-line bg-panel/40">
            <div className="flex h-11 shrink-0 items-center gap-1 border-b border-line px-3">
              <p className="flex-1 truncate text-sm text-ink" title={selected}>
                {selected}
              </p>
              <Button size="icon" variant="ghost" onClick={() => setCell(null)} aria-label="Close">
                <Icon name="x" size={14} />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <MatrixCellList passages={passages} onOpen={(p) => reveal(p.sourceId, p.start, p.end)} />
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

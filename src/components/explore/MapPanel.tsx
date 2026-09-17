import { useEffect, useMemo, useState } from "react";

import { api } from "../../lib/api";
import { mapRows, projectMap, type MapNode } from "../../lib/projectMap";
import type { CodingMatrix, MatrixSpec } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";
import { PanelEmpty } from "../ui/PanelEmpty";
import { ProjectMapChart } from "./ProjectMapChart";

const FIELD = "h-8 rounded-lg border border-line bg-surface px-2 text-xs text-ink outline-none focus:ring-2 focus:ring-accent/40";
type View = "map" | "table";

/** The project drawn as a map: codes, the codes they sit under, and where each one is used. */
export function MapPanel() {
  const { project, nodes, selectNode, selectSource, setView: setWorkspaceView, notify, referencesVersion, run } = useProject();
  const [spec, setSpec] = useState<MatrixSpec>({ themesOnly: false, columns: { kind: "sources" } });
  const [showEmpty, setShowEmpty] = useState(false);
  const [view, setView] = useState<View>("map");
  const [matrix, setMatrix] = useState<CodingMatrix | null>(null);

  useEffect(() => {
    if (!project) return;
    let live = true;
    void run(api.codingMatrix(project.id, spec)).then((result) => {
      if (live && result) setMatrix(result);
    });
    return () => {
      live = false;
    };
  }, [project, spec, referencesVersion, run]);

  const placeWord = spec.columns.kind === "cases" ? "case" : "source";
  const map = useMemo(() => (matrix ? projectMap(matrix, nodes, showEmpty) : null), [matrix, nodes, showEmpty]);
  const rows = useMemo(() => (map ? mapRows(map) : []), [map]);

  function open(node: MapNode) {
    if (node.kind === "code") {
      selectNode(node.id);
      return;
    }
    if (node.sourceIds.length === 1) {
      selectSource(node.sourceIds[0]);
      setWorkspaceView("read");
    } else {
      notify(`This ${placeWord} isn't linked to a single source, so there is nothing to open.`);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3 text-xs">
        <label className="flex items-center gap-1.5 text-muted">
          Codes
          <select value={spec.themesOnly ? "themes" : "codes"} onChange={(e) => setSpec({ ...spec, themesOnly: e.target.value === "themes" })} className={FIELD}>
            <option value="codes">Every code</option>
            <option value="themes">Top-level themes (sub-codes rolled up)</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-muted">
          Used in
          <select
            value={spec.columns.kind === "cases" ? "cases" : "sources"}
            onChange={(e) => setSpec({ ...spec, columns: { kind: e.target.value === "cases" ? "cases" : "sources" } })}
            className={FIELD}
          >
            <option value="sources">Sources</option>
            <option value="cases">Cases</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-muted">
          <input type="checkbox" checked={showEmpty} onChange={(e) => setShowEmpty(e.target.checked)} className="accent-accent" />
          Include what has nothing coded
        </label>
        <div role="radiogroup" aria-label="Show map as" className="ml-auto flex rounded-lg bg-line/50 p-0.5">
          {(["map", "table"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => setView(v)}
              className={`h-7 rounded-md px-3 capitalize transition-[background-color,color] duration-150 ${view === v ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <section className={`flex min-h-0 flex-1 flex-col px-5 py-4 ${view === "map" ? "overflow-hidden" : "overflow-y-auto"}`}>
        {!map ? (
          <div className="animate-breathe h-72 rounded-xl bg-panel" />
        ) : map.nodes.length === 0 ? (
          <PanelEmpty icon="compass" title="Nothing to map yet">
            Code a few passages and this draws your codes, the themes above them and the {placeWord}s they run through.
          </PanelEmpty>
        ) : (
          <>
            <p className="mb-3 text-xs text-muted">
              Circles are codes, squares are {placeWord}s, and a line means that code is used there — the thicker the line, the more passages. Dashed
              lines join a code to the theme above it, so a theme with nothing coded directly shows as a small dot. Drag to untangle, scroll to
              zoom, click to open.
              {map.hidden > 0 && !showEmpty ? ` ${map.hidden} ${map.hidden === 1 ? "code has" : "codes have"} nothing coded and ${map.hidden === 1 ? "is" : "are"} left out.` : ""}
            </p>
            {view === "map" ? (
              <div className="min-h-0 flex-1">
                <ProjectMapChart map={map} placeWord={placeWord} onOpen={open} />
              </div>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="py-2 pr-3 font-medium">Code</th>
                    <th className="py-2 pr-3 text-right font-medium">Passages</th>
                    <th className="py-2 font-medium">Used in</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-line/60 align-top">
                      <td className="py-1.5 pr-3 text-ink">
                        <button type="button" onClick={() => selectNode(row.id)} className="flex items-center gap-2 text-left hover:text-accent">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
                          {row.path}
                        </button>
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-ink">{row.total}</td>
                      <td className="py-1.5 text-muted">{row.places || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </section>
    </div>
  );
}

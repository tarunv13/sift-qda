import type { CaseTable, MatrixSpec } from "../../lib/types";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

export type MatrixView = "heatmap" | "table";

interface Props {
  spec: MatrixSpec;
  onSpec: (spec: MatrixSpec) => void;
  attributes: CaseTable["attributes"];
  view: MatrixView;
  onView: (view: MatrixView) => void;
  onExport: () => void;
  exporting: boolean;
}

const FIELD = "h-8 rounded-lg border border-line bg-surface px-2 text-xs text-ink outline-none focus:ring-2 focus:ring-accent/40";

const encode = (spec: MatrixSpec) => (spec.columns.kind === "attribute" ? `attribute:${spec.columns.id}` : spec.columns.kind);

function decode(value: string): MatrixSpec["columns"] {
  if (value.startsWith("attribute:")) return { kind: "attribute", id: Number(value.split(":")[1]) };
  return value === "cases" ? { kind: "cases" } : { kind: "sources" };
}

/** One row of settings above the matrix. */
export function MatrixControls({ spec, onSpec, attributes, view, onView, onExport, exporting }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3 text-xs">
      <label className="flex items-center gap-1.5 text-muted">
        Rows
        <select
          value={spec.themesOnly ? "themes" : "codes"}
          onChange={(e) => onSpec({ ...spec, themesOnly: e.target.value === "themes" })}
          className={FIELD}
        >
          <option value="codes">Every code</option>
          <option value="themes">Top-level themes (sub-codes rolled up)</option>
        </select>
      </label>
      <label className="flex items-center gap-1.5 text-muted">
        Columns
        <select value={encode(spec)} onChange={(e) => onSpec({ ...spec, columns: decode(e.target.value) })} className={`${FIELD} max-w-56`}>
          <option value="sources">Sources</option>
          <option value="cases">Cases</option>
          {attributes.length ? (
            <optgroup label="Cases grouped by attribute">
              {attributes.map((a) => (
                <option key={a.id} value={`attribute:${a.id}`}>
                  {a.name}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </label>
      <div role="radiogroup" aria-label="Show matrix as" className="ml-auto flex rounded-lg bg-line/50 p-0.5">
        {(["heatmap", "table"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={view === v}
            onClick={() => onView(v)}
            className={`h-7 rounded-md px-3 transition-[background-color,color] duration-150 ${
              view === v ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {v === "heatmap" ? "Heatmap" : "Table"}
          </button>
        ))}
      </div>
      <Button size="sm" onClick={onExport} disabled={exporting} title="Save this matrix as an Excel workbook">
        <Icon name="table" size={13} />
        {exporting ? "Exporting…" : "Export to Excel"}
      </Button>
    </div>
  );
}

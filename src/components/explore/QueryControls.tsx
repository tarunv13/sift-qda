import { codeOptions } from "../../lib/codePaths";
import type { CaseTable, CodeNode, QueryOperator, QuerySpec } from "../../lib/types";

const FIELD = "h-8 rounded-lg border border-line bg-surface px-2 text-xs text-ink outline-none focus:ring-2 focus:ring-accent/40";

const OPERATORS: { id: QueryOperator; label: string }[] = [
  { id: "only", label: "on its own" },
  { id: "and", label: "and also coded at" },
  { id: "or", label: "or coded at" },
  { id: "not", label: "but not coded at" },
  { id: "near", label: "near passages coded at" },
];

interface Props {
  spec: QuerySpec;
  onSpec: (spec: QuerySpec) => void;
  nodes: CodeNode[];
  table: CaseTable | null;
}

/** The query, read as a sentence: passages coded at A [operator] B, only for cases where … */
export function QueryControls({ spec, onSpec, nodes, table }: Props) {
  const codes = codeOptions(nodes);
  const set = (patch: Partial<QuerySpec>) => onSpec({ ...spec, ...patch });
  const column = table && spec.filter ? table.attributes.findIndex((a) => a.id === spec.filter?.attributeId) : -1;
  const values =
    table && column >= 0
      ? [...new Set(table.cases.map((c) => c.values[column].trim()).filter(Boolean))].sort((x, y) => x.localeCompare(y, undefined, { numeric: true }))
      : [];

  const codeSelect = (value: number | null, onChange: (id: number) => void, label: string) => (
    <select aria-label={label} value={value ?? ""} onChange={(e) => onChange(Number(e.target.value))} className={`${FIELD} max-w-64`}>
      <option value="" disabled>
        Choose a code…
      </option>
      {codes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-2 border-b border-line px-5 py-3 text-xs text-muted">
      <div className="flex flex-wrap items-center gap-2">
        <span>Passages coded at</span>
        {codeSelect(spec.a || null, (id) => set({ a: id }), "First code")}
        <select aria-label="How to combine" value={spec.operator} onChange={(e) => set({ operator: e.target.value as QueryOperator })} className={FIELD}>
          {OPERATORS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        {spec.operator !== "only" ? codeSelect(spec.b, (id) => set({ b: id }), "Second code") : null}
        {spec.operator === "near" ? (
          <label className="flex items-center gap-1.5">
            within
            <input
              type="number"
              min={0}
              max={5000}
              step={50}
              value={spec.distance}
              onChange={(e) => set({ distance: Math.max(0, Number(e.target.value) || 0) })}
              className={`${FIELD} w-20`}
            />
            characters
          </label>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={spec.includeSubCodes} onChange={(e) => set({ includeSubCodes: e.target.checked })} className="accent-accent" />
          Include sub-codes
        </label>
        <label className="flex items-center gap-1.5">
          Only cases where
          <select
            aria-label="Attribute"
            value={spec.filter?.attributeId ?? ""}
            onChange={(e) => set({ filter: e.target.value ? { attributeId: Number(e.target.value), value: "" } : null })}
            className={FIELD}
          >
            <option value="">any attribute</option>
            {table?.attributes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        {spec.filter ? (
          <label className="flex items-center gap-1.5">
            is
            <select
              aria-label="Attribute value"
              value={spec.filter.value}
              onChange={(e) => spec.filter && set({ filter: { attributeId: spec.filter.attributeId, value: e.target.value } })}
              className={FIELD}
            >
              <option value="" disabled>
                choose a value…
              </option>
              {values.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    </div>
  );
}

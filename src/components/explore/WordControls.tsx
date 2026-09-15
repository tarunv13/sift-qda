import type { ReactNode } from "react";

import type { AnalysisScope, WordOptions } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";

export type WordView = "cloud" | "bars" | "table";

interface Props {
  scope: AnalysisScope;
  onScope: (scope: AnalysisScope) => void;
  options: WordOptions;
  onOptions: (options: WordOptions) => void;
  view: WordView;
  onView: (view: WordView) => void;
}

const FIELD = "h-8 rounded-lg border border-line bg-surface px-2 text-xs text-ink outline-none focus:ring-2 focus:ring-accent/40";
const VIEWS: { id: WordView; label: string }[] = [
  { id: "cloud", label: "Cloud" },
  { id: "bars", label: "Bars" },
  { id: "table", label: "Table" },
];

const encode = (scope: AnalysisScope) => (scope.kind === "project" ? "project" : `${scope.kind}:${scope.id}`);

function decode(value: string): AnalysisScope {
  const [kind, id] = value.split(":");
  return kind === "source" || kind === "code" ? { kind, id: Number(id) } : { kind: "project" };
}

/** One row of filters above the words view; everything below follows them. */
export function WordControls({ scope, onScope, options, onOptions, view, onView }: Props) {
  const { sources, nodes } = useProject();
  const path = (id: number | null): string => {
    const node = nodes.find((n) => n.id === id);
    if (!node) return "";
    return node.parentId ? `${path(node.parentId)} › ${node.name}` : node.name;
  };
  const codes = nodes.map((n) => ({ id: n.id, label: path(n.id) })).sort((a, b) => a.label.localeCompare(b.label));
  const set = (patch: Partial<WordOptions>) => onOptions({ ...options, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3 text-xs">
      <Field label="Look at">
        <select value={encode(scope)} onChange={(e) => onScope(decode(e.target.value))} className={`${FIELD} max-w-56`}>
          <option value="project">All sources</option>
          {sources.length ? (
            <optgroup label="One source">
              {sources.map((s) => (
                <option key={s.id} value={`source:${s.id}`}>
                  {s.name}
                </option>
              ))}
            </optgroup>
          ) : null}
          {codes.length ? (
            <optgroup label="Passages coded at">
              {codes.map((c) => (
                <option key={c.id} value={`code:${c.id}`}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </Field>
      <Field label="Ignore common words">
        <select value={options.language} onChange={(e) => set({ language: e.target.value as WordOptions["language"] })} className={FIELD}>
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="en+hi">English and Hindi</option>
          <option value="none">None</option>
        </select>
      </Field>
      <Field label="Min. letters">
        <input
          type="number"
          min={1}
          max={20}
          value={options.minLength}
          onChange={(e) => set({ minLength: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })}
          className={`${FIELD} w-14`}
        />
      </Field>
      <label className="flex items-center gap-1.5 text-muted" title="Leave out labels such as “P01:” or “Interviewer:” at the start of a line">
        <input type="checkbox" checked={options.skipSpeakers} onChange={(e) => set({ skipSpeakers: e.target.checked })} className="accent-accent" />
        Skip speaker names
      </label>
      <div role="radiogroup" aria-label="Show words as" className="ml-auto flex rounded-lg bg-line/50 p-0.5">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={view === v.id}
            onClick={() => onView(v.id)}
            className={`h-7 rounded-md px-3 transition-[background-color,color] duration-150 ${
              view === v.id ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
      {options.extraStopWords.length ? (
        <div className="flex w-full flex-wrap items-center gap-1.5">
          <span className="text-muted">Hidden words:</span>
          {options.extraStopWords.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => set({ extraStopWords: options.extraStopWords.filter((x) => x !== w) })}
              className="rounded-full bg-line/60 px-2 py-0.5 text-ink transition-colors hover:bg-line"
              title={`Show “${w}” again`}
            >
              {w} ×
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 text-muted">
      {label}
      {children}
    </label>
  );
}

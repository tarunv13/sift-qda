import { useEffect, useState, type FormEvent } from "react";

import { api } from "../../lib/api";
import { nextColor } from "../../lib/colors";
import type { CaseTable, QueryResult, QuerySpec } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";
import { Button } from "../ui/Button";
import { PanelEmpty } from "../ui/PanelEmpty";
import { QueryControls } from "./QueryControls";
import { QueryResults } from "./QueryResults";

const WORDS = { only: "", and: "and", or: "or", not: "but not", near: "near" } as const;

const ready = (spec: QuerySpec) =>
  spec.a > 0 && (spec.operator === "only" || spec.b !== null) && (!spec.filter || spec.filter.value !== "");

/** Coding queries: combine codes, filter by case attributes, and save the results as a code. */
export function QueryPanel() {
  const { project, nodes, reveal, run, notify, referencesVersion, referencesChanged } = useProject();
  const [spec, setSpec] = useState<QuerySpec>({ a: 0, operator: "and", b: null, distance: 200, includeSubCodes: false, filter: null });
  const [table, setTable] = useState<CaseTable | null>(null);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (project) void run(api.getCaseTable(project.id)).then((t) => t && setTable(t));
  }, [project, run]);

  useEffect(() => {
    if (!project || !ready(spec)) return setResult(null);
    let live = true;
    setLoading(true);
    void run(api.codingQuery(project.id, spec)).then((r) => {
      if (!live) return;
      if (r) setResult(r);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [project, spec, referencesVersion, run]);

  const label = (id: number | null) => nodes.find((n) => n.id === id)?.name ?? "";

  function startNaming() {
    setName([label(spec.a), WORDS[spec.operator], spec.operator === "only" ? "" : label(spec.b)].filter(Boolean).join(" "));
    setNaming(true);
  }

  async function saveAsCode(event: FormEvent) {
    event.preventDefault();
    if (!project || !result || !name.trim()) return;
    const id = await run(api.codeQueryResults(project.id, spec, name.trim(), nextColor(nodes.map((n) => n.color))));
    if (id === undefined) return;
    notify(`Created “${name.trim()}” from ${result.hits.length} ${result.hits.length === 1 ? "passage" : "passages"}.`, "success");
    setNaming(false);
    referencesChanged();
  }

  const count = result?.hits.length ?? 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <QueryControls spec={spec} onSpec={setSpec} nodes={nodes} table={table} />
      <section className={`min-h-0 flex-1 overflow-y-auto px-5 py-4 transition-opacity duration-200 ${loading && result ? "opacity-60" : ""}`}>
        {nodes.length === 0 ? (
          <PanelEmpty icon="tag" title="No codes yet">
            Create codes and code some passages, then combine them here.
          </PanelEmpty>
        ) : !ready(spec) ? (
          <PanelEmpty icon="search" title="Build a query">
            Choose the codes to combine. Results update as you change the query.
          </PanelEmpty>
        ) : !result ? (
          <div className="animate-breathe h-40 rounded-xl bg-panel" />
        ) : (
          <>
            <div className="mb-4 flex min-h-8 flex-wrap items-center gap-2">
              <p className="text-xs text-muted">
                {count} {count === 1 ? "passage" : "passages"} in {result.sources} {result.sources === 1 ? "source" : "sources"}
                {result.truncated ? " (first 1,000 shown)" : ""}
              </p>
              {count === 0 ? null : naming ? (
                <form onSubmit={saveAsCode} className="ml-auto flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Escape" && setNaming(false)}
                    aria-label="New code name"
                    className="h-8 w-56 rounded-lg border border-line bg-surface px-2.5 text-xs text-ink outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <Button size="sm" variant="primary" type="submit" disabled={!name.trim()}>
                    Create code
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setNaming(false)}>
                    Cancel
                  </Button>
                </form>
              ) : (
                <Button size="sm" className="ml-auto" onClick={startNaming} title="Code every result passage at a new code">
                  Save results as a code
                </Button>
              )}
            </div>
            {count === 0 ? (
              <PanelEmpty icon="search" title="No passages match">
                Try another combination, a larger distance, or include sub-codes.
              </PanelEmpty>
            ) : (
              <QueryResults hits={result.hits} onOpen={(hit) => reveal(hit.sourceId, hit.start, hit.end)} />
            )}
          </>
        )}
      </section>
    </div>
  );
}

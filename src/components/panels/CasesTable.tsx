import { useEffect, useState } from "react";

import { api } from "../../lib/api";
import type { CaseTable } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";
import { PanelEmpty } from "../ui/PanelEmpty";

/** Cases and their attributes, as imported from survey spreadsheets or REFI-QDA. */
export function CasesTable() {
  const { project, sources, selectSource, run } = useProject();
  const [table, setTable] = useState<CaseTable | null>(null);

  useEffect(() => {
    if (!project) return;
    void run(api.getCaseTable(project.id)).then((t) => t && setTable(t));
  }, [project, sources, run]);

  if (!table) return null;
  if (table.cases.length === 0) {
    return (
      <PanelEmpty icon="table" title="No cases yet">
        Import a spreadsheet: the first row names the attributes and each following row becomes a case.
      </PanelEmpty>
    );
  }

  return (
    <div className="animate-rise p-4">
      <p className="mb-2 text-xs text-muted">
        {table.cases.length} cases · {table.attributes.length} attributes
      </p>
      <div className="overflow-auto rounded-lg border border-line bg-surface shadow-sm">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-panel">
            <tr>
              <th className="px-2.5 py-2 font-semibold whitespace-nowrap text-ink">Case</th>
              {table.attributes.map((a) => (
                <th key={a.id} className="px-2.5 py-2 font-semibold whitespace-nowrap text-ink" title={a.valueType}>
                  {a.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.cases.map((c) => (
              <tr
                key={c.id}
                onClick={() => c.sourceId !== null && selectSource(c.sourceId)}
                className={`border-t border-line transition-colors ${c.sourceId !== null ? "cursor-pointer hover:bg-accent-soft/60" : ""}`}
              >
                <td className="px-2.5 py-1.5 font-medium whitespace-nowrap text-ink">{c.name}</td>
                {c.values.map((v, i) => (
                  <td key={i} className="max-w-48 truncate px-2.5 py-1.5 text-muted" title={v}>
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

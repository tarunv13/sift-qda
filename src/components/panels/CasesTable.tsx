import { ask } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useState } from "react";

import { api } from "../../lib/api";
import type { CaseTable } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { PanelEmpty } from "../ui/PanelEmpty";
import { CaseRow } from "./CaseRow";
import { EditableCell } from "./EditableCell";

/** Cases and their attributes: imported from spreadsheets or REFI-QDA, or built here by hand. */
export function CasesTable() {
  const { project, sources, run, notify } = useProject();
  const [table, setTable] = useState<CaseTable | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!project) return;
    void run(api.getCaseTable(project.id)).then((t) => t && setTable(t));
  }, [project, sources, run, version]);

  const act = useCallback(
    async (task: Promise<unknown>) => {
      if (await run(task.then(() => true))) setVersion((v) => v + 1);
    },
    [run],
  );

  if (!project || !table) return null;
  const projectId = project.id;

  function uniqueAttributeName() {
    const taken = new Set(table?.attributes.map((a) => a.name.toLowerCase()));
    let n = 1;
    while (taken.has(n === 1 ? "new attribute" : `new attribute ${n}`)) n++;
    return n === 1 ? "New attribute" : `New attribute ${n}`;
  }

  async function casePerSource() {
    const created = await run(api.createCasesForSources(projectId));
    if (created === undefined) return;
    notify(created ? `Created ${created} ${created === 1 ? "case" : "cases"}, one per source.` : "Every source already has a case.", created ? "success" : "info");
    setVersion((v) => v + 1);
  }

  async function removeAttribute(id: number, name: string) {
    if (!(await ask(`Delete the attribute “${name}” and its value for every case?`, { title: "Delete attribute", kind: "warning" }))) return;
    await act(api.deleteAttribute(id));
  }

  const toolbar = (
    <div className="flex flex-wrap gap-1.5">
      <Button size="sm" variant="secondary" onClick={() => act(api.createCase(projectId, `Case ${table.cases.length + 1}`, null))}>
        <Icon name="plus" size={13} />
        Case
      </Button>
      <Button size="sm" variant="secondary" onClick={() => act(api.createAttribute(projectId, uniqueAttributeName()))}>
        <Icon name="plus" size={13} />
        Attribute
      </Button>
      <Button size="sm" variant="ghost" onClick={casePerSource} disabled={sources.length === 0}>
        <Icon name="table" size={13} />A case per source
      </Button>
    </div>
  );

  if (table.cases.length === 0 && table.attributes.length === 0) {
    return (
      <div className="p-4">
        <PanelEmpty icon="table" title="No cases yet">
          Cases are the people, places or organisations you study. Import a spreadsheet (row 1 names the attributes, each row
          becomes a case), or build them here.
        </PanelEmpty>
        <div className="flex justify-center">{toolbar}</div>
      </div>
    );
  }

  return (
    <div className="animate-rise space-y-3 p-4">
      {toolbar}
      <p className="text-xs text-muted">
        {table.cases.length} cases · {table.attributes.length} attributes · click any cell to edit
      </p>
      <div className="overflow-auto rounded-lg border border-line bg-surface shadow-sm">
        <table className="min-w-max border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-panel">
            <tr>
              <th className="px-2.5 py-2 font-semibold whitespace-nowrap text-ink">Case</th>
              <th className="px-2.5 py-2 font-semibold whitespace-nowrap text-ink">Source</th>
              {table.attributes.map((a) => (
                <th key={a.id} className="group px-1 py-1 font-semibold text-ink" title={a.valueType}>
                  <div className="flex items-center">
                    <EditableCell value={a.name} label="Attribute name" onCommit={(name) => act(api.renameAttribute(a.id, name))} />
                    <button
                      type="button"
                      onClick={() => removeAttribute(a.id, a.name)}
                      aria-label={`Delete attribute ${a.name}`}
                      className="rounded p-1 text-muted opacity-0 transition-[opacity,color] group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
                    >
                      <Icon name="x" size={11} />
                    </button>
                  </div>
                </th>
              ))}
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {table.cases.map((c) => (
              <CaseRow key={c.id} row={c} attributes={table.attributes} act={act} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

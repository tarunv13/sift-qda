import { ask } from "@tauri-apps/plugin-dialog";

import { api } from "../../lib/api";
import type { CaseTable } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";
import { Icon } from "../ui/Icon";
import { EditableCell } from "./EditableCell";

type Row = CaseTable["cases"][number];

const ICON_BUTTON = "rounded p-1 text-muted transition-colors hover:text-ink disabled:opacity-30";

interface Props {
  row: Row;
  attributes: CaseTable["attributes"];
  /** Runs an edit and reloads the table when it succeeds. */
  act: (task: Promise<unknown>) => Promise<void>;
}

/** One editable case: name, linked source, attribute values, memo and delete. */
export function CaseRow({ row, attributes, act }: Props) {
  const { project, sources, selectSource, run, notify } = useProject();

  async function newMemo() {
    if (!project) return;
    const memo = await run(api.createMemo(project.id, `Memo on ${row.name}`, row.sourceId, null, row.id));
    if (memo) notify(`Memo “${memo.title}” created. Open it from the Memos tab.`, "success");
  }

  async function remove() {
    if (!(await ask(`Delete the case “${row.name}” and its attribute values?`, { title: "Delete case", kind: "warning" }))) return;
    await act(api.deleteCase(row.id));
  }

  return (
    <tr className="group border-t border-line">
      <td className="min-w-32 px-1 py-0.5 font-medium text-ink">
        <EditableCell value={row.name} label="Case name" onCommit={(name) => act(api.renameCase(row.id, name))} />
      </td>
      <td className="px-1 py-0.5">
        <div className="flex items-center gap-0.5">
          <select
            value={row.sourceId ?? ""}
            onChange={(e) => act(api.linkCaseSource(row.id, e.target.value === "" ? null : Number(e.target.value)))}
            aria-label={`Source for ${row.name}`}
            className="max-w-40 min-w-24 rounded bg-transparent px-1 py-1 text-muted outline-none hover:bg-paper focus:ring-2 focus:ring-accent/30"
          >
            <option value="">No source</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={row.sourceId === null}
            onClick={() => row.sourceId !== null && selectSource(row.sourceId)}
            aria-label={`Open the source for ${row.name}`}
            title="Open source"
            className={ICON_BUTTON}
          >
            <Icon name="page" size={12} />
          </button>
        </div>
      </td>
      {attributes.map((attribute, i) => (
        <td key={attribute.id} className="min-w-24 px-1 py-0.5 text-muted">
          <EditableCell
            value={row.values[i] ?? ""}
            label={`${attribute.name} for ${row.name}`}
            placeholder="–"
            onCommit={(value) => act(api.setCaseValue(row.id, attribute.id, value))}
          />
        </td>
      ))}
      <td className="px-1 py-0.5 whitespace-nowrap">
        <button type="button" onClick={newMemo} aria-label={`New memo on ${row.name}`} title="New memo on this case" className={ICON_BUTTON}>
          <Icon name="note" size={12} />
        </button>
        <button type="button" onClick={remove} aria-label={`Delete ${row.name}`} title="Delete case" className={`${ICON_BUTTON} hover:text-danger`}>
          <Icon name="trash" size={12} />
        </button>
      </td>
    </tr>
  );
}

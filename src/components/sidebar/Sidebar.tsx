import { save } from "@tauri-apps/plugin-dialog";

import { api } from "../../lib/api";
import { useProject } from "../../state/ProjectContext";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { CodeTree } from "./CodeTree";
import { SourceList } from "./SourceList";

export function Sidebar() {
  const { project, openProject, run, notify } = useProject();

  async function exportProject() {
    if (!project) return;
    const path = await save({
      defaultPath: `${project.name}.qdpx`,
      filters: [{ name: "REFI-QDA project", extensions: ["qdpx"] }],
    });
    if (!path) return;
    if (await run(api.exportQdpx(project.id, path).then(() => true))) {
      notify(`Exported to ${path}. It opens in NVivo, ATLAS.ti and MAXQDA.`, "success");
    }
  }

  async function exportExcel() {
    if (!project) return;
    const path = await save({
      defaultPath: `${project.name} - coded extracts.xlsx`,
      filters: [{ name: "Excel workbook", extensions: ["xlsx"] }],
    });
    if (!path) return;
    if (await run(api.exportExcel(project.id, path).then(() => true))) {
      notify(`Saved ${path}: coded extracts, codebook, codes by document, documents and memos.`, "success");
    }
  }

  return (
    <aside className="animate-slide-panel flex min-h-0 flex-col border-r border-line bg-panel/60">
      <div className="flex h-12 items-center gap-1 border-b border-line px-2">
        <Button size="icon" variant="ghost" onClick={() => openProject(null)} aria-label="All projects" title="All projects">
          <Icon name="back" />
        </Button>
        <h1 className="flex-1 truncate font-reading text-[15px] text-ink" title={project?.name}>
          {project?.name}
        </h1>
        <Button size="icon" variant="ghost" onClick={exportExcel} aria-label="Export to Excel" title="Export to Excel (.xlsx)">
          <Icon name="table" />
        </Button>
        <Button size="icon" variant="ghost" onClick={exportProject} aria-label="Export as REFI-QDA" title="Export as REFI-QDA (.qdpx)">
          <Icon name="download" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2 py-3">
        <SourceList />
        <CodeTree />
      </div>
    </aside>
  );
}

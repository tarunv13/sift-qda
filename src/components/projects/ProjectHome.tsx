import { ask, open } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { api } from "../../lib/api";
import type { Project } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";
import { TourButton } from "../tour/TourButton";
import { useFirstRunTour } from "../tour/TourContext";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { PanelEmpty } from "../ui/PanelEmpty";
import { ThemeToggle } from "../ui/ThemeToggle";

export function ProjectHome() {
  const { openProject, run, notify } = useProject();
  useFirstRunTour("home");
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [name, setName] = useState("");
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => setProjects((await run(api.listProjects())) ?? []), [run]);
  useEffect(() => void load(), [load]);

  async function create(event: FormEvent) {
    event.preventDefault();
    const project = await run(api.createProject(name));
    if (project) openProject(project);
  }

  async function importQdpx() {
    const path = await open({ filters: [{ name: "REFI-QDA project", extensions: ["qdpx"] }] });
    if (typeof path !== "string") return;
    setImporting(true);
    const summary = await run(api.importQdpx(path));
    setImporting(false);
    if (!summary) return;
    const skipped = summary.skipped ? ` ${summary.skipped} unsupported items were skipped.` : "";
    notify(`Imported ${summary.sources} sources, ${summary.codes} codes and ${summary.references} coded references.${skipped}`, "success");
    const project = (await run(api.listProjects()))?.find((p) => p.id === summary.projectId);
    if (project) openProject(project);
  }

  async function remove(project: Project) {
    const confirmed = await ask(`Delete “${project.name}” with all its sources, codes and memos? This cannot be undone.`, {
      title: "Delete project",
      kind: "warning",
    });
    if (confirmed && (await run(api.deleteProject(project.id).then(() => true)))) void load();
  }

  return (
    <main className="h-full overflow-y-auto">
      <div data-tour="home-prefs" className="animate-fade fixed top-3 right-4 z-10 flex items-center gap-1.5">
        <ThemeToggle />
        <TourButton tour="home" />
      </div>
      <div className="mx-auto flex max-w-2xl flex-col gap-12 px-8 py-20">
        <header className="animate-rise">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Sift QDA</p>
          <h1 className="font-reading mt-4 text-[2.6rem] leading-tight text-ink">Your research, on your machine.</h1>
          <p className="mt-3 max-w-lg text-muted">
            Bring in interviews, papers and survey data. Code what matters and find the themes. Nothing leaves this computer.
          </p>
        </header>

        <form onSubmit={create} data-tour="home-create" className="animate-rise flex gap-2 [animation-delay:70ms]">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name a new project…"
            aria-label="Project name"
            className="h-11 flex-1 rounded-xl border border-line bg-surface px-4 text-ink shadow-sm outline-none transition-shadow placeholder:text-muted/70 focus:ring-2 focus:ring-accent/40"
          />
          <Button type="submit" variant="primary" className="h-11 px-5" disabled={!name.trim()}>
            Create project
          </Button>
        </form>

        <section data-tour="home-projects" className="animate-rise [animation-delay:140ms]">
          <div className="mb-3 flex items-center">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Projects</h2>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={importQdpx} disabled={importing} data-tour="home-import">
              <Icon name="upload" size={14} />
              {importing ? "Importing…" : "Open an NVivo / REFI-QDA export"}
            </Button>
          </div>

          {projects === null ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="animate-breathe h-16 rounded-xl bg-panel" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <PanelEmpty icon="sparkle" title="A blank page">
              Name your first project above, or open a .qdpx file exported from NVivo, ATLAS.ti or MAXQDA.
            </PanelEmpty>
          ) : (
            <ul className="space-y-2">
              {projects.map((project, i) => (
                <li key={project.id} className="group animate-rise relative" style={{ animationDelay: `${180 + i * 40}ms` }}>
                  <button
                    type="button"
                    onClick={() => openProject(project)}
                    className="flex w-full items-center gap-4 rounded-xl border border-line bg-surface px-4 py-3.5 text-left shadow-sm transition-[transform,box-shadow] duration-200 ease-out-expo hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft font-reading text-lg text-accent">
                      {project.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="flex-1">
                      <span className="block font-medium text-ink">{project.name}</span>
                      <span className="text-xs text-muted">Created {new Date(`${project.createdAt}Z`).toLocaleDateString()}</span>
                    </span>
                    <Icon name="chevron" className="text-muted transition-transform duration-200 group-hover:translate-x-0.5" />
                  </button>
                  <Button
                    variant="danger"
                    size="icon"
                    aria-label={`Delete ${project.name}`}
                    onClick={() => remove(project)}
                    className="absolute top-1/2 right-11 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Icon name="trash" size={14} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

import { ask, open } from "@tauri-apps/plugin-dialog";
import { useState } from "react";

import { api } from "../../lib/api";
import type { SourceKind, SourceSummary } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { TranscribeDialog } from "../transcribe/TranscribeDialog";
import { SectionHeader } from "../ui/SectionHeader";

const FILTERS = [
  { name: "Documents", extensions: ["docx", "doc", "odt", "pdf", "txt", "md", "xlsx", "xls", "ods"] },
];
const KIND_LABEL: Record<SourceKind, string> = { text: "TXT", docx: "DOC", pdf: "PDF", xlsx: "XLS" };

export function SourceList() {
  const { project, sources, sourceId, selectSource, refresh, run, notify } = useProject();
  const [busy, setBusy] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  async function importFiles() {
    if (!project) return;
    const picked = await open({ multiple: true, filters: FILTERS });
    if (!picked || picked.length === 0) return;
    setBusy(true);
    const outcomes = await run(api.importSourceFiles(project.id, picked));
    setBusy(false);
    if (!outcomes) return;
    await refresh();
    const failed = outcomes.filter((o) => o.error);
    const imported = outcomes.length - failed.length;
    if (imported) notify(`Imported ${imported} ${imported === 1 ? "source" : "sources"}.`, "success");
    if (failed.length) notify(failed.map((f) => `${f.name}: ${f.error}`).join("\n"), "error");
    const first = outcomes.find((o) => o.sourceId !== null);
    if (first?.sourceId) selectSource(first.sourceId);
  }

  async function remove(source: SourceSummary) {
    const detail = source.referenceCount ? ` and its ${source.referenceCount} coded references` : "";
    if (!(await ask(`Delete “${source.name}”${detail}?`, { title: "Delete source", kind: "warning" }))) return;
    if (await run(api.deleteSource(source.id).then(() => true))) {
      if (sourceId === source.id) selectSource(null);
      await refresh();
    }
  }

  return (
    <section data-tour="sources">
      <SectionHeader
        title="Sources"
        count={sources.length}
        action={
          <div className="flex items-center gap-0.5">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setTranscribing(true)}
              aria-label="Transcribe audio"
              title="Transcribe audio"
              data-tour="transcribe"
            >
              <Icon name="mic" />
            </Button>
            <Button size="icon" variant="ghost" onClick={importFiles} disabled={busy} aria-label="Import files" title="Import files">
              <Icon name={busy ? "sparkle" : "plus"} className={busy ? "animate-spin" : ""} />
            </Button>
          </div>
        }
      />
      {transcribing ? <TranscribeDialog onClose={() => setTranscribing(false)} /> : null}
      {sources.length === 0 ? (
        <button
          type="button"
          onClick={importFiles}
          className="animate-rise mt-1 flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted transition-colors hover:border-accent/50 hover:text-ink"
        >
          <Icon name="upload" size={20} className="animate-float text-accent" />
          <span className="font-medium text-ink">Import your first sources</span>
          <span className="text-xs">Word, PDF, text or survey spreadsheets. Transcribe audio with the microphone button.</span>
        </button>
      ) : (
        <ul className="mt-0.5 space-y-px">
          {sources.map((source, i) => {
            const active = source.id === sourceId;
            return (
              <li key={source.id} className="group animate-rise relative" style={{ animationDelay: `${i * 25}ms` }}>
                <button
                  type="button"
                  onClick={() => selectSource(source.id)}
                  aria-current={active ? "true" : undefined}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-[background-color,box-shadow] duration-150 ${
                    active ? "bg-surface text-ink shadow-sm" : "text-ink/80 hover:bg-surface/60"
                  }`}
                >
                  <span className="w-8 shrink-0 rounded bg-line/60 py-0.5 text-center text-[9.5px] font-semibold tracking-wide text-muted">
                    {KIND_LABEL[source.kind]}
                  </span>
                  <span className="flex-1 truncate">{source.name}</span>
                  <span className="text-xs tabular-nums text-muted transition-opacity group-hover:opacity-0">
                    {source.referenceCount || ""}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => remove(source)}
                  aria-label={`Delete ${source.name}`}
                  className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-1 text-muted opacity-0 transition-[opacity,color] group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
                >
                  <Icon name="trash" size={13} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

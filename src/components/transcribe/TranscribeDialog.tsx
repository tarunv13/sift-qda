import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";

import { api } from "../../lib/api";
import { AUDIO_EXTENSIONS, type TranscriberStatus, type TranscriptionEvent, type TranscriptionProgress } from "../../lib/transcribeTypes";
import { useProject } from "../../state/ProjectContext";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { TranscriberFolder } from "./TranscriberFolder";
import { TranscribeForm, type FormValue } from "./TranscribeForm";

const START: FormValue = { mode: "en", labelSpeakers: false, speakerCount: 2, speakerNames: "", terms: "" };

/** Transcribes one audio file locally and imports the transcript as a source. */
export function TranscribeDialog({ onClose }: { onClose: () => void }) {
  const { project, refresh, selectSource, run, notify } = useProject();
  const [status, setStatus] = useState<TranscriberStatus | null>(null);
  const [file, setFile] = useState<string | null>(null);
  const [form, setForm] = useState(START);
  const [job, setJob] = useState<string | null>(null);
  const [progress, setProgress] = useState<TranscriptionProgress | null>(null);

  useEffect(() => {
    void run(api.getTranscriber()).then((s) => s && setStatus(s));
  }, [run]);

  useEffect(() => {
    if (!job) return;
    const stop = listen<TranscriptionEvent>("transcription-progress", (e) => {
      if (e.payload.jobId === job) setProgress(e.payload.progress);
    });
    return () => void stop.then((unlisten) => unlisten());
  }, [job]);

  async function pick() {
    const picked = await open({ multiple: false, filters: [{ name: "Audio", extensions: AUDIO_EXTENSIONS }] });
    if (typeof picked === "string") setFile(picked);
  }

  async function start() {
    if (!project || !file) return;
    const id = crypto.randomUUID();
    setJob(id);
    setProgress(null);
    const sourceId = await run(
      api.transcribeAudio(project.id, file, id, {
        mode: form.mode,
        speakers: form.labelSpeakers ? form.speakerCount : null,
        speakerNames: form.labelSpeakers ? form.speakerNames : null,
        prompt: form.terms || null,
      }),
    );
    setJob(null);
    if (sourceId === undefined) return;
    await refresh();
    selectSource(sourceId);
    notify("Transcript imported. Select a passage and play the audio from there.", "success");
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="transcribe-title"
      onKeyDown={(e) => e.key === "Escape" && !job && onClose()}
      className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4 backdrop-blur-sm"
    >
      <div className="animate-pop w-full max-w-md space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-2xl">
        <div className="flex items-center gap-2">
          <Icon name="mic" size={18} className="text-accent" />
          <h2 id="transcribe-title" className="font-reading text-lg text-ink">
            Transcribe audio
          </h2>
          {job ? null : (
            <Button size="icon" variant="ghost" className="ml-auto" onClick={onClose} aria-label="Close">
              <Icon name="x" size={14} />
            </Button>
          )}
        </div>
        {!status ? (
          <div className="animate-breathe h-20 rounded-lg bg-panel" />
        ) : job ? (
          <div className="space-y-3" aria-live="polite">
            <div className="h-2 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out-expo" style={{ width: `${progress?.percent ?? 2}%` }} />
            </div>
            <p className="text-sm text-ink">
              {progress
                ? `${Math.round(progress.percent)}% · ${progress.done} of ${progress.total}${progress.remaining ? ` · about ${progress.remaining} left` : ""}`
                : "Loading the speech model. The first minute can be quiet."}
            </p>
            <p className="text-xs text-muted">Everything runs on this computer. Keep Sift QDA open until it finishes.</p>
            <Button size="sm" variant="danger" onClick={() => void api.cancelTranscription(job)}>
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <TranscriberFolder status={status} onChange={setStatus} />
            {status.ready ? <TranscribeForm file={file} onPick={pick} value={form} onChange={setForm} /> : null}
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={start} disabled={!status.ready || !file}>
                Transcribe and import
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

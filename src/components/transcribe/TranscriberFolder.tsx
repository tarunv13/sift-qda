import { open } from "@tauri-apps/plugin-dialog";

import { api } from "../../lib/api";
import type { TranscriberStatus } from "../../lib/transcribeTypes";
import { useProject } from "../../state/ProjectContext";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

interface Props {
  status: TranscriberStatus;
  onChange: (status: TranscriberStatus) => void;
}

/** Points Sift QDA at the transcriber already on this computer. */
export function TranscriberFolder({ status, onChange }: Props) {
  const { run } = useProject();

  async function choose() {
    const folder = await open({ directory: true, title: "Choose your transcriber folder" });
    if (typeof folder !== "string") return;
    const next = await run(api.setTranscriberFolder(folder));
    if (next) onChange(next);
  }

  if (status.ready) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-accent-soft/60 px-3 py-2 text-xs text-ink">
        <Icon name="check" size={13} className="text-accent" />
        <span className="min-w-0 flex-1 truncate" title={status.folder ?? undefined}>
          Transcriber ready
        </span>
        <Button size="sm" variant="ghost" onClick={choose}>
          Change folder
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-line bg-paper p-3 text-sm">
      <p className="leading-relaxed text-muted">
        Sift QDA uses a transcriber you already have on this computer: a folder containing{" "}
        <code className="rounded bg-panel px-1 text-xs">transcribe.py</code> and its Python environment in{" "}
        <code className="rounded bg-panel px-1 text-xs">.venv</code>. Audio is never uploaded.
      </p>
      {status.folder && status.problem ? <p className="text-xs text-danger">{status.problem}</p> : null}
      <Button size="sm" variant="primary" onClick={choose}>
        <Icon name="upload" size={13} />
        Choose folder…
      </Button>
    </div>
  );
}

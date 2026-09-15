import { useState } from "react";

import { api } from "../../lib/api";
import type { AssistTarget } from "../../lib/assistTypes";
import { useProject } from "../../state/ProjectContext";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

interface Props {
  target: AssistTarget;
  label: string;
  /** An icon-only button for tight rows. */
  compact?: boolean;
}

/** Drafts a summary with the local chat model and saves it as a linked memo. */
export function SummariseButton({ target, label, compact = false }: Props) {
  const { run, notify } = useProject();
  const [busy, setBusy] = useState(false);

  async function summarise() {
    setBusy(true);
    const memo = await run(api.aiSummarise(target));
    setBusy(false);
    if (memo) notify(`Summary saved as the memo “${memo.title}”. Open it from the Memos tab.`, "success");
  }

  const icon = <Icon name="sparkle" size={compact ? 12 : 13} className={busy ? "animate-breathe text-accent" : ""} />;
  if (compact) {
    return (
      <button
        type="button"
        onClick={summarise}
        disabled={busy}
        aria-label={label}
        title={busy ? "Summarising with the local model…" : label}
        className="rounded p-1 text-muted transition-colors hover:text-ink disabled:cursor-progress"
      >
        {icon}
      </button>
    );
  }
  return (
    <Button size="sm" variant="ghost" onClick={summarise} disabled={busy} aria-busy={busy} title="Runs on this computer through Ollama">
      {icon}
      {busy ? "Summarising… this can take a minute" : label}
    </Button>
  );
}

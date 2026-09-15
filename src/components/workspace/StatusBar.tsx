import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

import { api } from "../../lib/api";
import type { EmbeddingStatus, IndexStatus } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";
import { UndoButton } from "../common/UndoButton";
import { TourButton } from "../tour/TourButton";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { ThemeToggle } from "../ui/ThemeToggle";
import { AiSettings } from "./AiSettings";

/** Shows the local semantic index as it fills, and gives access to its settings. */
export function StatusBar() {
  const { sources } = useProject();
  const [index, setIndex] = useState<IndexStatus | null>(null);
  const [event, setEvent] = useState<EmbeddingStatus | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    api.embeddingStatus().then(setIndex).catch(() => undefined);
  }, [sources, event]);

  useEffect(() => {
    const unlisten = listen<EmbeddingStatus>("embedding-status", (e) => setEvent(e.payload));
    return () => void unlisten.then((stop) => stop());
  }, []);

  const offline = event?.state === "offline" && (index?.pending ?? 0) > 0;
  const total = index?.total ?? 0;
  const done = total - (index?.pending ?? 0);
  const indexing = !offline && total > 0 && done < total;

  const label = !index
    ? ""
    : total === 0
      ? "Semantic search activates once you import sources"
      : offline
        ? "Local AI is offline, so only exact search works for now"
        : indexing
          ? `Reading for meaning… ${done} of ${total} passages`
          : `Semantic search ready · ${total} passages`;

  const dot = offline ? "bg-warn" : indexing ? "bg-accent animate-breathe" : total ? "bg-accent" : "bg-muted/50";

  return (
    <footer className="col-span-3 flex h-8 items-center gap-2.5 border-t border-line bg-panel/70 px-3 text-xs text-muted">
      <span data-tour="index" className="flex items-center gap-2.5">
        <span className={`h-2 w-2 rounded-full transition-colors duration-300 ${dot}`} />
        <span key={label} className="animate-rise" title={event?.message ?? undefined}>
          {label}
        </span>
      </span>
      {indexing ? (
        <span className="h-1 w-28 overflow-hidden rounded-full bg-line">
          <span
            className="block h-full rounded-full bg-accent transition-[width] duration-500 ease-out-expo"
            style={{ width: `${(done / total) * 100}%` }}
          />
        </span>
      ) : null}
      <div className="relative ml-auto flex items-center gap-1.5">
        <UndoButton />
        <div data-tour="prefs" className="flex items-center gap-1.5">
          <ThemeToggle />
          <TourButton tour="workspace" />
        </div>
        <Button size="sm" variant="ghost" onClick={() => setSettingsOpen((v) => !v)} aria-expanded={settingsOpen}>
          <Icon name="sliders" size={13} />
          Local AI
        </Button>
        {settingsOpen ? (
          <AiSettings message={offline ? event?.message ?? null : null} onClose={() => setSettingsOpen(false)} />
        ) : null}
      </div>
    </footer>
  );
}

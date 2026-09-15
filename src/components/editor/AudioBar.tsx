import { useEffect, useRef, useState } from "react";

import { api } from "../../lib/api";
import type { TranscriptMeta } from "../../lib/transcribeTypes";
import type { Source } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

const MIME: Record<string, string> = {
  wav: "audio/wav",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  wma: "audio/x-ms-wma",
};

function clock(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/** The audio behind a transcript, with a button to play from the selected passage. */
export function AudioBar({ source, meta, cursor }: { source: Source; meta: TranscriptMeta; cursor: number | null }) {
  const { run } = useProject();
  const audio = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    let made: string | null = null;
    setUrl(null);
    void run(api.readSourceBytes(source.id)).then((buffer) => {
      if (!live || !buffer) return;
      const extension = source.filePath?.split(".").pop()?.toLowerCase() ?? "";
      made = URL.createObjectURL(new Blob([buffer], { type: MIME[extension] ?? "audio/*" }));
      setUrl(made);
    });
    return () => {
      live = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [source.id, source.filePath, run]);

  // The paragraph holding the cursor starts at the last start at or before it.
  let from: number | null = null;
  if (cursor !== null) {
    for (const [offset, seconds] of meta.starts) {
      if (offset > cursor) break;
      from = seconds;
    }
  }

  function playFrom(seconds: number) {
    if (!audio.current) return;
    audio.current.currentTime = seconds;
    void audio.current.play();
  }

  return (
    <div data-tour="audio" className="flex shrink-0 items-center gap-3 border-b border-line bg-panel/40 px-5 py-2">
      <Icon name="mic" size={15} className="text-muted" />
      <audio ref={audio} controls src={url ?? undefined} className="h-8 min-w-0 flex-1" aria-label={`Audio of ${source.name}`} />
      <Button size="sm" variant="secondary" disabled={!url || from === null} onClick={() => from !== null && playFrom(from)}>
        <Icon name="chevron" size={12} />
        {from === null ? "Select a passage to play it" : `Play from ${clock(from)}`}
      </Button>
    </div>
  );
}

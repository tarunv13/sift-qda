import { useEffect, useRef, useState } from "react";

import { api } from "../../lib/api";
import type { Annotation, PassageLink } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";
import { Icon } from "../ui/Icon";

const QUOTE =
  "block w-full rounded-md bg-paper px-2.5 py-2 text-left font-reading text-[13.5px] leading-relaxed text-ink/90 transition-colors hover:bg-accent-soft";
const REMOVE =
  "rounded p-1 text-muted opacity-0 transition-[opacity,color] group-hover:opacity-100 hover:text-danger focus-visible:opacity-100";

/** An annotation: its passage (click to show it) and an autosaving comment. */
export function AnnotationItem({ note, onDeleted }: { note: Annotation; onDeleted: () => void }) {
  const { reveal, run } = useProject();
  const [body, setBody] = useState(note.body);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => void run(api.updateAnnotation(note.id, body)), 600);
    return () => clearTimeout(timer);
  }, [body, note.id, run]);

  async function remove() {
    if (await run(api.deleteAnnotation(note.id).then(() => true))) onDeleted();
  }

  return (
    <li className="group animate-rise rounded-lg border border-line bg-surface p-2.5 shadow-sm">
      <button type="button" onClick={() => reveal(note.sourceId, note.start, note.end)} className={QUOTE} title="Show in the text">
        “{note.text}”
      </button>
      <div className="mt-2 flex items-start gap-1">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          aria-label="Annotation"
          placeholder="Write a comment…"
          className="min-h-0 flex-1 resize-y rounded-md bg-transparent px-1.5 py-1 text-sm leading-relaxed text-ink outline-none placeholder:text-muted/60 focus:bg-paper focus:ring-2 focus:ring-accent/30"
        />
        <button type="button" onClick={remove} aria-label="Delete annotation" title="Delete" className={REMOVE}>
          <Icon name="trash" size={13} />
        </button>
      </div>
    </li>
  );
}

/** A see-also link seen from the open source; click the far passage to open it. */
export function LinkItem({ link, onDeleted }: { link: PassageLink; onDeleted: () => void }) {
  const { reveal, run } = useProject();

  async function remove() {
    if (await run(api.deletePassageLink(link.id).then(() => true))) onDeleted();
  }

  return (
    <li className="group animate-rise rounded-lg border border-line bg-surface p-2.5 shadow-sm">
      <p className="mb-1.5 flex items-center gap-2 text-xs text-muted">
        <Icon name="link" size={12} />
        <span className="truncate">
          {link.outgoing ? "See also" : "Linked from"} · {link.otherSourceName}
        </span>
        <button type="button" onClick={remove} aria-label="Delete link" title="Delete link" className={`ml-auto ${REMOVE}`}>
          <Icon name="trash" size={13} />
        </button>
      </p>
      <button type="button" onClick={() => reveal(link.otherSourceId, link.thereStart, link.thereEnd)} className={QUOTE} title="Open the linked passage">
        “{link.thereText}”
      </button>
      <p className="mt-1.5 line-clamp-2 px-1 text-xs text-muted">From here: “{link.hereText}”</p>
    </li>
  );
}

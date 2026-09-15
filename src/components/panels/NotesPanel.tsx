import { useEffect, useState, type FormEvent } from "react";

import { api } from "../../lib/api";
import { notes, useNotes } from "../../lib/notesStore";
import type { SourceNotes } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { PanelEmpty } from "../ui/PanelEmpty";
import { AnnotationItem, LinkItem } from "./NotesItems";

/** Annotations and see-also links for the open source, plus the annotate and link flows. */
export function NotesPanel() {
  const { sourceId, sources, run, notify } = useProject();
  const { compose, linkFrom, version } = useNotes();
  const [data, setData] = useState<SourceNotes | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (sourceId === null) return setData(null);
    let live = true;
    void run(api.listSourceNotes(sourceId)).then((loaded) => live && loaded && setData(loaded));
    return () => {
      live = false;
    };
  }, [sourceId, version, run]);

  useEffect(() => setDraft(""), [compose]);

  const nameOf = (id: number) => sources.find((s) => s.id === id)?.name ?? "";

  async function saveAnnotation(event: FormEvent) {
    event.preventDefault();
    if (!compose || !draft.trim()) return;
    const id = await run(api.createAnnotation(compose.sourceId, compose.start, compose.end, draft.trim()));
    if (id === undefined) return;
    notes.cancelCompose();
    notes.changed();
    notify("Annotation added.", "success");
  }

  return (
    <div className="space-y-4 p-4">
      {linkFrom ? (
        <div className="animate-rise rounded-xl border border-accent/30 bg-accent-soft/60 p-3 text-sm">
          <p className="flex items-center gap-2 text-xs font-medium text-accent">
            <Icon name="link" size={13} />
            Linking from {nameOf(linkFrom.sourceId)}
          </p>
          <p className="mt-1.5 line-clamp-3 font-reading text-[13.5px] text-ink">“{linkFrom.text}”</p>
          <p className="mt-2 text-xs text-muted">Now select the passage to link to, in any source, and choose Link here.</p>
          <Button size="sm" variant="ghost" className="mt-2" onClick={notes.cancelLink}>
            Cancel link
          </Button>
        </div>
      ) : null}

      {compose ? (
        <form onSubmit={saveAnnotation} className="animate-rise rounded-xl border border-line bg-surface p-3 shadow-sm">
          <p className="text-xs text-muted">Annotate a passage in {nameOf(compose.sourceId)}</p>
          <p className="mt-1.5 line-clamp-3 font-reading text-[13.5px] text-ink">“{compose.text}”</p>
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && notes.cancelCompose()}
            rows={3}
            aria-label="New annotation"
            placeholder="What do you notice here?"
            className="mt-2 w-full resize-y rounded-lg bg-paper p-2 text-sm leading-relaxed text-ink outline-none focus:ring-2 focus:ring-accent/40"
          />
          <div className="mt-2 flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={notes.cancelCompose}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" disabled={!draft.trim()}>
              Save annotation
            </Button>
          </div>
        </form>
      ) : null}

      {sourceId === null ? (
        <PanelEmpty icon="note" title="Open a source">
          Its annotations and links appear here. Select text in a source and choose Annotate or Link.
        </PanelEmpty>
      ) : !data ? (
        <div className="animate-breathe h-24 rounded-lg bg-panel" />
      ) : data.annotations.length === 0 && data.links.length === 0 ? (
        compose ? null : (
          <PanelEmpty icon="note" title="No annotations or links yet">
            Select a passage, then choose Annotate to comment on it or Link to connect it with another passage.
          </PanelEmpty>
        )
      ) : (
        <>
          {data.annotations.length ? (
            <section>
              <h3 className="mb-2 text-xs font-medium text-muted">Annotations · {data.annotations.length}</h3>
              <ul className="space-y-2">
                {data.annotations.map((note) => (
                  <AnnotationItem key={note.id} note={note} onDeleted={notes.changed} />
                ))}
              </ul>
            </section>
          ) : null}
          {data.links.length ? (
            <section>
              <h3 className="mb-2 text-xs font-medium text-muted">Links · {data.links.length}</h3>
              <ul className="space-y-2">
                {data.links.map((link) => (
                  <LinkItem key={link.id} link={link} onDeleted={notes.changed} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

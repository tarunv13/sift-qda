import type { Editor } from "@tiptap/react";

import { api } from "../../lib/api";
import { notes, useNotes, type PassageRef } from "../../lib/notesStore";
import { posToOffset, type ParagraphIndex } from "../../lib/offsets";
import { useProject } from "../../state/ProjectContext";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

interface Props {
  editor: Editor;
  sourceId: number;
  index: ParagraphIndex;
  /** Collapses the selection once an action has started. */
  onDone: () => void;
}

/** Annotate or link the selected passage; the Notes tab finishes the job. */
export function SelectionNoteActions({ editor, sourceId, index, onDone }: Props) {
  const { run, notify } = useProject();
  const { linkFrom } = useNotes();

  function passage(): PassageRef | null {
    const { from, to } = editor.state.selection;
    const start = posToOffset(editor.state.doc, from, index);
    const end = posToOffset(editor.state.doc, to, index);
    if (end <= start) return null;
    return { sourceId, start, end, text: editor.state.doc.textBetween(from, to, "\n").slice(0, 300) };
  }

  function annotate() {
    const selected = passage();
    if (!selected) return;
    notes.compose(selected);
    onDone();
  }

  function startLink() {
    const selected = passage();
    if (!selected) return;
    notes.startLink(selected);
    onDone();
  }

  async function linkHere() {
    const to = passage();
    if (!to || !linkFrom) return;
    if (linkFrom.sourceId === to.sourceId && linkFrom.start === to.start && linkFrom.end === to.end) {
      notify("Select a different passage to link to.", "info");
      return;
    }
    const id = await run(api.createPassageLink(linkFrom.sourceId, linkFrom.start, linkFrom.end, to.sourceId, to.start, to.end));
    if (id === undefined) return;
    notes.cancelLink();
    notes.changed();
    notify("Passages linked. Both appear in the Notes tab.", "success");
    onDone();
  }

  const keepSelection = (e: { preventDefault: () => void }) => e.preventDefault();

  return (
    <>
      <Button size="sm" variant="ghost" onMouseDown={keepSelection} onClick={annotate} title="Comment on this passage">
        <Icon name="note" size={13} />
        Annotate
      </Button>
      {linkFrom ? (
        <Button size="sm" variant="ghost" onMouseDown={keepSelection} onClick={linkHere} title="Link the passage you chose to this one">
          <Icon name="link" size={13} />
          Link here
        </Button>
      ) : (
        <Button size="sm" variant="ghost" onMouseDown={keepSelection} onClick={startLink} title="Link this passage to another passage">
          <Icon name="link" size={13} />
          Link…
        </Button>
      )}
    </>
  );
}

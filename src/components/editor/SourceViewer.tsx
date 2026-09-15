import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useMemo, useRef, type MouseEvent } from "react";

import { indexParagraphs, offsetToPos, pageAt, posToOffset } from "../../lib/offsets";
import type { CodingReference, Source } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";
import { AttachCodeMenu } from "./AttachCodeMenu";
import { buildDoc } from "./buildDoc";
import { CodingStripes } from "./CodingStripes";
import { CodeMark } from "./CodeMark";
import { ALLOW_CHANGE, ReadOnlyText } from "./ReadOnlyText";

interface Props {
  source: Source;
  references: CodingReference[];
  onCoded: () => void;
  onPage: (page: number) => void;
  /** Show a named stripe beside the text for each coded passage. */
  stripes: boolean;
}

/** The coding surface: immutable source text with stacked CodeMark highlights. */
export function SourceViewer({ source, references, onCoded, onPage, stripes }: Props) {
  const { focus, selectNode } = useProject();
  const index = useMemo(() => indexParagraphs(source.content), [source.content]);
  const scroller = useRef<HTMLDivElement>(null);
  const article = useRef<HTMLElement>(null);
  // Reference ids currently rendered as marks; lets us skip rebuilding after our own edits.
  const applied = useRef(new Set(references.map((r) => r.id)));

  const editor = useEditor({
    extensions: [Document, Paragraph, Text, CodeMark, ReadOnlyText],
    content: buildDoc(source.content, references),
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: { class: "source-text", spellcheck: "false", "aria-label": `Text of ${source.name}`, "aria-readonly": "true" },
    },
    onSelectionUpdate: ({ editor: e }) => {
      const { from, empty } = e.state.selection;
      if (!empty && source.pages.length) onPage(pageAt(source.pages, posToOffset(e.state.doc, from, index)));
    },
  });

  // Rebuild marks when references change elsewhere (uncoding, deleted codes, colour edits).
  useEffect(() => {
    if (!editor) return;
    const ids = new Set(references.map((r) => r.id));
    const unchanged = ids.size === applied.current.size && [...ids].every((id) => applied.current.has(id));
    const needsRestyle = references.some((r) => !editor.view.dom.querySelector(`[data-reference-id="${r.id}"][style*="${r.color}"]`));
    if (unchanged && !needsRestyle) return;
    const top = scroller.current?.scrollTop ?? 0;
    editor.chain().setMeta(ALLOW_CHANGE, true).setContent(buildDoc(source.content, references), { emitUpdate: false }).run();
    applied.current = ids;
    requestAnimationFrame(() => scroller.current?.scrollTo({ top }));
  }, [editor, references, source.content]);

  // Jump to a passage chosen in the references or search panel.
  useEffect(() => {
    if (!editor || !focus || focus.sourceId !== source.id) return;
    const from = offsetToPos(focus.start, index);
    const to = offsetToPos(focus.end, index);
    editor.chain().focus(undefined, { scrollIntoView: false }).setTextSelection({ from, to }).scrollIntoView().run();
    requestAnimationFrame(() => {
      const node = editor.view.domAtPos(from).node;
      const element = node instanceof HTMLElement ? node : node.parentElement;
      element?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }, [editor, focus, index, source.id]);

  function openCodeUnderCursor(event: MouseEvent<HTMLDivElement>) {
    const mark = (event.target as HTMLElement).closest<HTMLElement>("[data-node-id]");
    if (mark && editor?.state.selection.empty) selectNode(Number(mark.dataset.nodeId));
  }

  return (
    <div ref={scroller} onClick={openCodeUnderCursor} className="relative min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
      <article ref={article} className="animate-rise relative mx-auto max-w-[70ch] px-10 pt-10 pb-32">
        <EditorContent editor={editor} />
        {editor && stripes ? <CodingStripes editor={editor} references={references} index={index} article={article} /> : null}
      </article>
      {editor ? (
        <AttachCodeMenu
          editor={editor}
          sourceId={source.id}
          index={index}
          onCoded={(referenceId) => {
            applied.current.add(referenceId);
            onCoded();
          }}
        />
      ) : null}
    </div>
  );
}

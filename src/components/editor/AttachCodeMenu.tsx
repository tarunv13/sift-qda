import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";

import { api } from "../../lib/api";
import { nextColor } from "../../lib/colors";
import { posToOffset, type ParagraphIndex } from "../../lib/offsets";
import type { CodeNode } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { ALLOW_CHANGE } from "./ReadOnlyText";
import { SelectionNoteActions } from "./SelectionNoteActions";

interface Props {
  editor: Editor;
  sourceId: number;
  index: ParagraphIndex;
  onCoded: (referenceId: number) => void;
}

/** Floating toolbar over a text selection: one-click recent codes, or search and create. */
export function AttachCodeMenu({ editor, sourceId, index, onCoded }: Props) {
  const { project, nodes, run } = useProject();
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const trimmed = query.trim();
  const matches = useMemo(() => {
    const q = trimmed.toLowerCase();
    const list = q ? nodes.filter((n) => n.name.toLowerCase().includes(q)) : [...nodes].sort((a, b) => b.referenceCount - a.referenceCount);
    return list.slice(0, 7);
  }, [nodes, trimmed]);
  const canCreate = trimmed !== "" && !nodes.some((n) => n.name.toLowerCase() === trimmed.toLowerCase());

  function reset() {
    setPicking(false);
    setQuery("");
    setActive(0);
  }

  async function attach(node: CodeNode) {
    const { from, to } = editor.state.selection;
    const start = posToOffset(editor.state.doc, from, index);
    const end = posToOffset(editor.state.doc, to, index);
    if (end <= start) return;
    const reference = await run(api.saveCodingReference(sourceId, start, end, node.id));
    if (!reference) return;
    editor
      .chain()
      .setMeta(ALLOW_CHANGE, true)
      .setTextSelection({ from, to })
      .setCodeMark({ referenceId: reference.id, nodeId: node.id, color: node.color, name: node.name })
      .setTextSelection(to)
      .run();
    reset();
    onCoded(reference.id);
  }

  async function createAndAttach() {
    if (!project || !canCreate) return;
    const node = await run(api.createNode(project.id, trimmed, nextColor(nodes.map((n) => n.color)), null));
    if (node) await attach(node);
  }

  function onKey(event: KeyboardEvent<HTMLInputElement>) {
    const options = matches.length + (canCreate ? 1 : 0);
    if (event.key === "ArrowDown") setActive((a) => (a + 1) % Math.max(1, options));
    else if (event.key === "ArrowUp") setActive((a) => (a - 1 + options) % Math.max(1, options));
    else if (event.key === "Escape") reset();
    else if (event.key === "Enter") {
      if (active < matches.length) void attach(matches[active]);
      else void createAndAttach();
    } else return;
    event.preventDefault();
  }

  const keepSelection = (e: { preventDefault: () => void }) => e.preventDefault();

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ state }) => !state.selection.empty}
      options={{ placement: "top", offset: 10, onHide: reset }}
      className="z-30"
    >
      <div className="animate-pop origin-bottom overflow-hidden rounded-xl border border-line bg-surface text-sm shadow-xl">
        {!picking ? (
          <div className="flex items-center gap-1 p-1">
            <Button
              size="sm"
              variant="primary"
              onMouseDown={keepSelection}
              onClick={() => {
                setPicking(true);
                requestAnimationFrame(() => input.current?.focus());
              }}
            >
              <Icon name="tag" size={13} />
              Attach code
            </Button>
            {matches.slice(0, 3).map((node) => (
              <button
                key={node.id}
                type="button"
                onMouseDown={keepSelection}
                onClick={() => attach(node)}
                className="flex h-7 max-w-36 items-center gap-1.5 rounded-lg px-2 text-xs text-ink/85 transition-colors hover:bg-panel"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: node.color }} />
                <span className="truncate">{node.name}</span>
              </button>
            ))}
            <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-line" />
            <SelectionNoteActions editor={editor} sourceId={sourceId} index={index} onDone={() => editor.commands.setTextSelection(editor.state.selection.to)} />
          </div>
        ) : (
          <div className="animate-pop w-64 p-1.5">
            <input
              ref={input}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKey}
              placeholder="Find or create a code…"
              aria-label="Find or create a code"
              className="mb-1 h-8 w-full rounded-lg bg-paper px-2.5 text-ink outline-none focus:ring-2 focus:ring-accent/40"
            />
            <ul role="listbox" className="max-h-56 overflow-y-auto">
              {matches.map((node, i) => (
                <li key={node.id} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => attach(node)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left ${i === active ? "bg-panel" : ""}`}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: node.color }} />
                    <span className="flex-1 truncate text-ink">{node.name}</span>
                    <span className="text-xs tabular-nums text-muted">{node.referenceCount || ""}</span>
                  </button>
                </li>
              ))}
              {canCreate ? (
                <li role="option" aria-selected={active === matches.length}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(matches.length)}
                    onClick={createAndAttach}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-accent ${active === matches.length ? "bg-accent-soft" : ""}`}
                  >
                    <Icon name="plus" size={13} />
                    <span className="truncate">Create “{trimmed}”</span>
                  </button>
                </li>
              ) : null}
              {matches.length === 0 && !canCreate ? <li className="px-2 py-2 text-xs text-muted">Type to name a new code</li> : null}
            </ul>
          </div>
        )}
      </div>
    </BubbleMenu>
  );
}

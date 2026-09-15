import { ask } from "@tauri-apps/plugin-dialog";
import { useEffect, useRef, useState } from "react";

import { api } from "../../lib/api";
import type { Memo } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

interface Props {
  memo: Memo;
  sourceName?: string;
  nodeName?: string;
  caseName?: string;
  onBack: () => void;
  onSaved: (memo: Memo) => void;
  onDeleted: () => void;
}

/** Autosaving memo editor (saves 600 ms after typing stops). */
export function MemoEditor({ memo, sourceName, nodeName, caseName, onBack, onSaved, onDeleted }: Props) {
  const { run } = useProject();
  const linkedTo = caseName ? `the case “${caseName}”` : nodeName ? `the code “${nodeName}”` : sourceName;
  const [title, setTitle] = useState(memo.title);
  const [body, setBody] = useState(memo.body);
  const [state, setState] = useState<"saved" | "saving" | "idle">("idle");
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setState("saving");
    const timer = setTimeout(async () => {
      const saved = await run(api.updateMemo(memo.id, title, body));
      if (saved) {
        onSaved(saved);
        setState("saved");
      }
    }, 600);
    return () => clearTimeout(timer);
    // onSaved is recreated by the parent on every render; saving depends only on the text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, memo.id, run]);

  async function remove() {
    if (!(await ask(`Delete the memo “${title || "Untitled memo"}”?`, { title: "Delete memo", kind: "warning" }))) return;
    if (await run(api.deleteMemo(memo.id).then(() => true))) onDeleted();
  }

  return (
    <div className="animate-from-right flex h-full flex-col p-4">
      <div className="mb-3 flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <Icon name="back" size={14} />
          Memos
        </Button>
        <span key={state} className="animate-rise ml-auto text-xs text-muted">
          {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : ""}
        </span>
        <Button size="icon" variant="danger" onClick={remove} aria-label="Delete memo">
          <Icon name="trash" size={14} />
        </Button>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Memo title"
        aria-label="Memo title"
        className="rounded-md bg-transparent px-1 font-reading text-xl text-ink outline-none focus:ring-2 focus:ring-accent/30"
      />
      {linkedTo ? <p className="mt-1 px-1 text-xs text-muted">Linked to {linkedTo}</p> : null}
      <textarea
        autoFocus
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What are you noticing?"
        aria-label="Memo text"
        className="mt-3 min-h-0 flex-1 resize-none rounded-lg border border-line bg-surface p-3 font-reading text-[15px] leading-relaxed text-ink shadow-sm outline-none focus:ring-2 focus:ring-accent/30"
      />
    </div>
  );
}

import { useEffect, useState } from "react";

import { api } from "../../lib/api";
import type { Memo } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { PanelEmpty } from "../ui/PanelEmpty";
import { MemoEditor } from "./MemoEditor";

export function MemoPanel() {
  const { project, sourceId, sources, run } = useProject();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    if (!project) return;
    void run(api.listMemos(project.id)).then((list) => list && setMemos(list));
  }, [project, run]);

  async function create() {
    if (!project) return;
    const source = sources.find((s) => s.id === sourceId);
    const memo = await run(api.createMemo(project.id, source ? `Notes on ${source.name}` : "Untitled memo", sourceId));
    if (!memo) return;
    setMemos((all) => [memo, ...all]);
    setOpenId(memo.id);
  }

  const open = memos.find((m) => m.id === openId);
  if (open) {
    return (
      <MemoEditor
        key={open.id}
        memo={open}
        sourceName={sources.find((s) => s.id === open.sourceId)?.name}
        onBack={() => setOpenId(null)}
        onSaved={(saved) => setMemos((all) => all.map((m) => (m.id === saved.id ? saved : m)))}
        onDeleted={() => {
          setMemos((all) => all.filter((m) => m.id !== open.id));
          setOpenId(null);
        }}
      />
    );
  }

  return (
    <div className="animate-from-left p-4">
      <Button variant="primary" className="w-full justify-center" onClick={create}>
        <Icon name="plus" size={15} />
        {sourceId !== null ? "New memo on this source" : "New memo"}
      </Button>
      {memos.length === 0 ? (
        <PanelEmpty icon="note" title="Think out loud">
          Memos hold your hunches, decisions and emerging theory as you code.
        </PanelEmpty>
      ) : (
        <ul className="mt-4 space-y-2">
          {memos.map((memo, i) => (
            <li key={memo.id} className="animate-rise" style={{ animationDelay: `${i * 30}ms` }}>
              <button
                type="button"
                onClick={() => setOpenId(memo.id)}
                className="block w-full rounded-lg border border-line bg-surface p-3 text-left shadow-sm transition-[transform,box-shadow] duration-200 ease-out-expo hover:-translate-y-px hover:shadow-md"
              >
                <span className="block truncate font-medium text-ink">{memo.title || "Untitled memo"}</span>
                <span className="mt-1 line-clamp-2 text-sm text-muted">{memo.body || "Empty"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

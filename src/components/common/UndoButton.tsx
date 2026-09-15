import { useCallback, useEffect } from "react";

import { undo, useUndoLabel } from "../../lib/undo";
import { useProject } from "../../state/ProjectContext";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

/** Reverses the last coding action; also bound to Ctrl+Z outside text fields. */
export function UndoButton() {
  const { project, run, referencesChanged, notify } = useProject();
  const label = useUndoLabel();

  // History belongs to one project.
  useEffect(() => undo.clear(), [project?.id]);

  const undoLast = useCallback(async () => {
    const entry = undo.pop();
    if (!entry) return;
    const ok = await run(entry.revert().then(() => true));
    referencesChanged();
    if (ok) notify(`Undone: ${entry.label}.`, "info");
  }, [run, referencesChanged, notify]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.key.toLowerCase() !== "z") return;
      const target = event.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, select, [contenteditable=true]");
      if (typing && !typing.closest(".ProseMirror")) return;
      event.preventDefault();
      void undoLast();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undoLast]);

  if (!label) return null;
  return (
    <Button size="sm" variant="ghost" onClick={undoLast} title={`Undo ${label} (Ctrl+Z)`} className="animate-rise max-w-64">
      <Icon name="undo" size={13} />
      <span className="truncate">Undo {label}</span>
    </Button>
  );
}

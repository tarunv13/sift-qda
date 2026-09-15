import { useEffect, useRef, useState, type FormEvent } from "react";

import { api } from "../../lib/api";
import { COLOR_NAMES, nextColor, PALETTE } from "../../lib/colors";
import { useProject } from "../../state/ProjectContext";
import { Button } from "../ui/Button";

/** Inline form that unfolds beneath the Codes header. */
export function NewCodeForm({ open, onDone }: { open: boolean; onDone: () => void }) {
  const { project, nodes, nodeId, refresh, run, selectNode } = useProject();
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [nested, setNested] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const parent = nodes.find((n) => n.id === nodeId);

  useEffect(() => {
    if (!open) return;
    setName("");
    setNested(false);
    setColor(nextColor(nodes.map((n) => n.color)));
    requestAnimationFrame(() => input.current?.focus());
    // Only when the form opens; later node changes must not reset what the user typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!project || !name.trim()) return;
    const node = await run(api.createNode(project.id, name.trim(), color, nested && parent ? parent.id : null));
    if (!node) return;
    await refresh();
    selectNode(node.id);
    onDone();
  }

  return (
    <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out-expo ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
      <form onSubmit={submit} className="overflow-hidden" inert={!open}>
        <div className="mx-1 mt-1 mb-2 space-y-2.5 rounded-xl border border-line bg-surface p-2.5 shadow-sm">
          <input
            ref={input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onDone()}
            placeholder="Code name, e.g. Climate anxiety"
            aria-label="Code name"
            className="h-8 w-full rounded-lg bg-paper px-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-accent/40"
          />
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Colour">
            {PALETTE.map((swatch) => (
              <button
                key={swatch}
                type="button"
                role="radio"
                aria-checked={swatch === color}
                aria-label={COLOR_NAMES[swatch]}
                title={COLOR_NAMES[swatch]}
                onClick={() => setColor(swatch)}
                className={`h-5 w-5 rounded-full transition-transform duration-150 hover:scale-110 ${swatch === color ? "scale-110 ring-2 ring-ink/70 ring-offset-2 ring-offset-surface" : ""}`}
                style={{ background: swatch }}
              />
            ))}
          </div>
          {parent ? (
            <label className="flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={nested} onChange={(e) => setNested(e.target.checked)} className="accent-accent" />
              Place inside “{parent.name}”
            </label>
          ) : null}
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={onDone}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" disabled={!name.trim()}>
              Add code
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

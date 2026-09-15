import { useState } from "react";

import { api } from "../../lib/api";
import { PALETTE } from "../../lib/colors";
import type { CodeNode } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";

/** Header of the Coded tab: rename, recolour and describe the code in place. */
export function NodeDetails({ node }: { node: CodeNode }) {
  const { run, referencesChanged } = useProject();
  const [name, setName] = useState(node.name);
  const [description, setDescription] = useState(node.description);
  const [editingColor, setEditingColor] = useState(false);

  async function save(changes: Partial<Pick<CodeNode, "name" | "color" | "description">>) {
    const next = { id: node.id, name, description, color: node.color, parentId: node.parentId, ...changes };
    if (next.name.trim() === "") return setName(node.name);
    if (next.name === node.name && next.description === node.description && next.color === node.color) return;
    if (await run(api.updateNode(next))) referencesChanged();
  }

  return (
    <header className="animate-rise">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => setEditingColor((v) => !v)}
          aria-label="Change colour"
          aria-expanded={editingColor}
          className="h-4 w-4 shrink-0 rounded-full ring-2 ring-surface transition-transform duration-150 hover:scale-110"
          style={{ background: node.color }}
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => save({ name: name.trim() })}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          aria-label="Code name"
          className="min-w-0 flex-1 rounded-md bg-transparent px-1 font-reading text-xl text-ink outline-none focus:bg-surface focus:ring-2 focus:ring-accent/30"
        />
      </div>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out-expo ${editingColor ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden" inert={!editingColor}>
          <div className="flex flex-wrap gap-1.5 pt-3 pl-7">
            {PALETTE.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={swatch}
                onClick={() => {
                  setEditingColor(false);
                  void save({ color: swatch });
                }}
                className={`h-5 w-5 rounded-full transition-transform duration-150 hover:scale-110 ${swatch === node.color ? "ring-2 ring-ink/60 ring-offset-2 ring-offset-paper" : ""}`}
                style={{ background: swatch }}
              />
            ))}
          </div>
        </div>
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={() => save({ description })}
        placeholder="Describe when this code applies…"
        rows={2}
        aria-label="Code description"
        className="mt-2 w-full resize-none rounded-md bg-transparent px-1 text-sm leading-relaxed text-muted outline-none placeholder:text-muted/60 focus:bg-surface focus:text-ink focus:ring-2 focus:ring-accent/30"
      />
      <p className="mt-1 pl-1 text-xs text-muted">
        <span className="tabular-nums">{node.referenceCount}</span> references across{" "}
        <span className="tabular-nums">{node.sourceCount}</span> {node.sourceCount === 1 ? "source" : "sources"}
      </p>
    </header>
  );
}

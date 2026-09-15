import { ask } from "@tauri-apps/plugin-dialog";
import { useMemo, useState, type DragEvent, type ReactNode } from "react";

import { api } from "../../lib/api";
import type { CodeNode } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { SectionHeader } from "../ui/SectionHeader";
import { NewCodeForm } from "./NewCodeForm";
import { canMove, useMoveCode } from "./useMoveCode";

export function CodeTree() {
  const { nodes, nodeId, selectNode, referencesChanged, run } = useProject();
  const move = useMoveCode();
  const [adding, setAdding] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [dragged, setDragged] = useState<CodeNode | null>(null);
  const [over, setOver] = useState<number | "top" | null>(null);

  const children = useMemo(() => {
    const map = new Map<number | null, CodeNode[]>();
    for (const node of nodes) map.set(node.parentId, [...(map.get(node.parentId) ?? []), node]);
    return map;
  }, [nodes]);

  function toggle(id: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function remove(node: CodeNode) {
    const detail = node.referenceCount ? `, uncoding ${node.referenceCount} references` : "";
    if (!(await ask(`Delete the code “${node.name}” and any codes inside it${detail}?`, { title: "Delete code", kind: "warning" }))) return;
    if (await run(api.deleteNode(node.id).then(() => true))) {
      if (nodeId === node.id) selectNode(null);
      referencesChanged();
    }
  }

  // Drag a code onto another to nest it, or onto the strip above the tree to un-nest it.
  function dropTarget(target: number | null) {
    const key = target ?? "top";
    return {
      onDragOver(e: DragEvent) {
        if (!dragged || !canMove(nodes, dragged, target)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (over !== key) setOver(key);
      },
      onDragLeave: () => setOver((current) => (current === key ? null : current)),
      onDrop(e: DragEvent) {
        e.preventDefault();
        if (dragged) void move(dragged, target);
        if (target !== null) setCollapsed((prev) => new Set([...prev].filter((id) => id !== target)));
        endDrag();
      },
    };
  }

  function endDrag() {
    setDragged(null);
    setOver(null);
  }

  function level(parent: number | null, depth: number): ReactNode {
    return (children.get(parent) ?? []).map((node) => {
      const kids = children.get(node.id);
      const open = !collapsed.has(node.id);
      const active = node.id === nodeId;
      const highlight = over === node.id ? "bg-accent-soft ring-2 ring-accent/50" : active ? "bg-surface shadow-sm" : "hover:bg-surface/60";
      return (
        <li key={node.id} className="animate-rise">
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", node.name);
              setDragged(node);
            }}
            onDragEnd={endDrag}
            {...dropTarget(node.id)}
            className={`group relative flex items-center rounded-lg pr-1 text-sm transition-colors duration-150 ${highlight} ${dragged?.id === node.id ? "opacity-50" : ""}`}
            style={{ paddingLeft: depth * 14 }}
          >
            <button
              type="button"
              onClick={() => toggle(node.id)}
              aria-label={open ? `Collapse ${node.name}` : `Expand ${node.name}`}
              className={`grid h-7 w-5 place-items-center text-muted ${kids ? "" : "invisible"}`}
            >
              <Icon name="chevron" size={12} className={`transition-transform duration-300 ease-out-expo ${open ? "rotate-90" : ""}`} />
            </button>
            <button type="button" onClick={() => selectNode(node.id)} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-surface" style={{ background: node.color }} />
              <span className={`truncate ${active ? "text-ink" : "text-ink/85"}`}>{node.name}</span>
              <span className="ml-auto pl-2 text-xs tabular-nums text-muted transition-opacity group-hover:opacity-0">
                {node.referenceCount || ""}
              </span>
            </button>
            <button
              type="button"
              onClick={() => remove(node)}
              aria-label={`Delete ${node.name}`}
              className="absolute right-1.5 rounded p-1 text-muted opacity-0 transition-[opacity,color] group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
            >
              <Icon name="trash" size={13} />
            </button>
          </div>
          {kids ? (
            <div className={`grid transition-[grid-template-rows] duration-300 ease-out-expo ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <ul className="overflow-hidden">{level(node.id, depth + 1)}</ul>
            </div>
          ) : null}
        </li>
      );
    });
  }

  return (
    <section data-tour="codes">
      <SectionHeader
        title="Codes"
        count={nodes.length}
        action={
          <Button size="icon" variant="ghost" onClick={() => setAdding((v) => !v)} aria-label="New code" title="New code">
            <Icon name="plus" className={`transition-transform duration-300 ease-out-expo ${adding ? "rotate-45" : ""}`} />
          </Button>
        }
      />
      <NewCodeForm open={adding} onDone={() => setAdding(false)} />
      {dragged && dragged.parentId !== null ? (
        <div
          {...dropTarget(null)}
          className={`animate-rise mt-1 rounded-lg border border-dashed px-2 py-1.5 text-center text-xs transition-colors ${over === "top" ? "border-accent bg-accent-soft text-ink" : "border-line text-muted"}`}
        >
          Drop here to make “{dragged.name}” a top-level code
        </div>
      ) : null}
      {nodes.length === 0 && !adding ? (
        <p className="animate-rise px-2 py-3 text-xs leading-relaxed text-muted">
          Codes are your themes. Create one here, or just select text in a source and name a code as you go.
        </p>
      ) : (
        <ul className="mt-1 space-y-px">{level(null, 0)}</ul>
      )}
    </section>
  );
}

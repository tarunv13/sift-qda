import type { JSONContent } from "@tiptap/react";

import type { CodingReference } from "../../lib/types";

/**
 * Turns source text plus its coding references into a TipTap document. Each
 * line becomes a paragraph; text is split at every reference boundary so that
 * overlapping codes become stacked `codeMark` marks on the same run.
 */
export function buildDoc(content: string, references: CodingReference[]): JSONContent {
  const sorted = [...references].sort((a, b) => a.startIndex - b.startIndex);
  const paragraphs: JSONContent[] = [];
  let base = 0;

  for (const line of content.split("\n")) {
    const chars = Array.from(line);
    const end = base + chars.length;
    const local = sorted
      .filter((r) => r.startIndex < end && r.endIndex > base)
      .map((r) => ({ ref: r, s: Math.max(0, r.startIndex - base), e: Math.min(chars.length, r.endIndex - base) }));

    const cuts = new Set([0, chars.length]);
    for (const { s, e } of local) {
      cuts.add(s);
      cuts.add(e);
    }
    const bounds = [...cuts].sort((a, b) => a - b);
    const runs: JSONContent[] = [];
    for (let i = 0; i < bounds.length - 1; i++) {
      const [a, b] = [bounds[i], bounds[i + 1]];
      if (a === b) continue;
      const text = chars.slice(a, b).join("");
      const marks = local
        .filter(({ s, e }) => s <= a && e >= b)
        .map(({ ref }) => ({
          type: "codeMark",
          attrs: { referenceId: ref.id, nodeId: ref.nodeId, color: ref.color, name: ref.nodeName },
        }));
      runs.push(marks.length ? { type: "text", text, marks } : { type: "text", text });
    }
    paragraphs.push(runs.length ? { type: "paragraph", content: runs } : { type: "paragraph" });
    base = end + 1;
  }
  return { type: "doc", content: paragraphs };
}

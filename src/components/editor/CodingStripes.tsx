import type { Editor } from "@tiptap/react";
import { useEffect, useState, type RefObject } from "react";

import { offsetToPos, type ParagraphIndex } from "../../lib/offsets";
import { assignLanes } from "../../lib/stripes";
import type { CodingReference } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";

const LANE = 18;
const MAX_LANES = 8;
/** Space between stripes that follow each other in one lane, so their labels never run together. */
const GAP = 3;

interface Props {
  editor: Editor;
  references: CodingReference[];
  index: ParagraphIndex;
  article: RefObject<HTMLElement | null>;
}

interface Stripe {
  reference: CodingReference;
  lane: number;
  top: number;
  height: number;
}

/** A named bar beside the text for each coded passage, one lane per overlap. */
export function CodingStripes({ editor, references, index, article }: Props) {
  const { selectNode } = useProject();
  const [stripes, setStripes] = useState<Stripe[]>([]);

  useEffect(() => {
    const element = article.current;
    if (!element) return;
    const measure = () => {
      // The editor view attaches to the page after this component mounts; measure once it has.
      if (editor.isDestroyed || !element.contains(editor.view.dom)) return;
      const base = element.getBoundingClientRect().top;
      setStripes(
        assignLanes(references)
          .filter(({ lane }) => lane < MAX_LANES)
          .map(({ item, lane }) => {
            const from = editor.view.coordsAtPos(offsetToPos(item.startIndex, index), 1);
            const to = editor.view.coordsAtPos(offsetToPos(item.endIndex, index), -1);
            return { reference: item, lane, top: from.top - base, height: Math.max(18, to.bottom - from.top - GAP) };
          }),
      );
    };
    const frame = requestAnimationFrame(measure);
    // Fires once when observation starts, then on every reflow of the text.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [editor, references, index, article]);

  const lanes = stripes.reduce((most, s) => Math.max(most, s.lane + 1), 0);

  return (
    <div aria-label="Coding stripes" className="absolute top-0 left-full h-full" style={{ width: lanes * LANE }}>
      {stripes.map(({ reference, lane, top, height }) => (
        <button
          key={reference.id}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            selectNode(reference.nodeId);
          }}
          title={reference.nodeName}
          aria-label={`Coded “${reference.nodeName}”`}
          className="animate-rise absolute overflow-hidden rounded-sm text-left transition-[filter] hover:brightness-110"
          style={{
            left: lane * LANE,
            top,
            height,
            width: LANE - 4,
            borderLeft: `3px solid ${reference.color}`,
            background: `color-mix(in srgb, ${reference.color} 16%, transparent)`,
          }}
        >
          <span className="block truncate px-px pt-1 text-[10px] leading-none text-ink/80 [writing-mode:vertical-rl]" style={{ maxHeight: height - 4 }}>
            {reference.nodeName}
          </span>
        </button>
      ))}
    </div>
  );
}

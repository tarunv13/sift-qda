import type { Placement } from "./steps";

export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Size {
  width: number;
  height: number;
}

const PAD = 6;
const GAP = 14;
const MARGIN = 16;

/** The spotlight around a target, with a little breathing room. */
export function spotlightBox(rect: DOMRect): Box | null {
  if (rect.width === 0 && rect.height === 0) return null;
  return { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 };
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

/** Where the explanation card goes: beside the target when it fits, otherwise flipped, always on screen. */
export function cardPosition(target: Box | null, placement: Placement, card: Size, view: Size): { top: number; left: number } {
  const centred = { top: (view.height - card.height) / 2, left: (view.width - card.width) / 2 };
  if (!target || placement === "center") return centred;

  const midY = target.top + target.height / 2 - card.height / 2;
  const midX = target.left + target.width / 2 - card.width / 2;
  const right = target.left + target.width + GAP;
  const left = target.left - GAP - card.width;
  const below = target.top + target.height + GAP;
  const above = target.top - GAP - card.height;

  let pos: { top: number; left: number };
  switch (placement) {
    case "over":
      pos = { top: target.top + target.height * 0.55 - card.height / 2, left: midX };
      break;
    case "right":
      pos = { top: midY, left: right + card.width + MARGIN <= view.width ? right : left };
      break;
    case "left":
      pos = { top: midY, left: left >= MARGIN ? left : right };
      break;
    case "bottom":
      pos = { top: below + card.height + MARGIN <= view.height ? below : above, left: midX };
      break;
    case "top":
      pos = { top: above >= MARGIN ? above : below, left: midX };
      break;
  }

  return {
    top: clamp(pos.top, MARGIN, view.height - card.height - MARGIN),
    left: clamp(pos.left, MARGIN, view.width - card.width - MARGIN),
  };
}

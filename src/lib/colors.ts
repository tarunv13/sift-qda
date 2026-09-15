/**
 * Code colours: eight hues in a fixed order, checked for colour-blind safety and contrast with the
 * dataviz palette validator. Each hex works on both themes' surfaces (worst neighbouring pair under
 * red-green colour blindness ΔE 8.4, normal vision ΔE 19.3; ≥ 3:1 contrast on cards and dark surfaces).
 * On the light paper and panel a few sit just under 3:1, which is acceptable only because a code's
 * name always accompanies its colour. Keep that true: never identify a code by colour alone.
 */
export const PALETTE = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];

/** Spoken names for the colour pickers. */
export const COLOR_NAMES: Record<string, string> = {
  "#3987e5": "Blue",
  "#d95926": "Orange",
  "#199e70": "Aqua",
  "#c98500": "Yellow",
  "#d55181": "Magenta",
  "#008300": "Green",
  "#9085e9": "Violet",
  "#e66767": "Red",
};

/** The least-used palette colour (earliest in order on ties), so new codes stay visually distinct. */
export function nextColor(used: string[]): string {
  const counts = PALETTE.map((c) => used.filter((u) => u.toLowerCase() === c).length);
  return PALETTE[counts.indexOf(Math.min(...counts))];
}

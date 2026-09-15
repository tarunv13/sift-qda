/** Code colours: distinct at 20% tint on paper, readable as underlines in dark mode. */
export const PALETTE = [
  "#e2a336",
  "#d8664c",
  "#c34f7c",
  "#8a5cc2",
  "#4a73c8",
  "#3499ad",
  "#3c9a69",
  "#8ba63a",
  "#ad8750",
  "#6d7a8c",
];

/** The least-used palette colour, so new codes stay visually distinct. */
export function nextColor(used: string[]): string {
  const counts = PALETTE.map((c) => used.filter((u) => u.toLowerCase() === c).length);
  return PALETTE[counts.indexOf(Math.min(...counts))];
}

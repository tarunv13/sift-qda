// Sequential colour for heatmaps: one hue, from the validated reference blue ramp.
// Light mode runs light → dark; dark mode flips so small values recede into the dark surface.
const LIGHT = ["#cde2fb", "#86b6ef", "#3987e5", "#1c5cab", "#0d366b"];
const DARK = ["#184f95", "#256abf", "#3987e5", "#86b6ef", "#cde2fb"];

export interface Band {
  min: number;
  max: number;
  color: string;
  label: string;
}

/**
 * Up to five bands covering 1…max. Zero stays outside every band and is drawn as empty.
 * With only a few bands the extreme ends of the ramp are skipped, so a count of 2 beside a count
 * of 1 reads as a step rather than a dramatic hotspot.
 */
export function bands(max: number, dark: boolean): Band[] {
  if (max <= 0) return [];
  const ramp = dark ? DARK : LIGHT;
  const steps = Math.min(ramp.length, max);
  const bottom = steps >= 4 ? 0 : 1;
  const top = steps >= 4 ? ramp.length - 1 : 3;
  const edges = Array.from({ length: steps + 1 }, (_, i) => Math.round((i * max) / steps));
  const out: Band[] = [];
  for (let i = 0; i < steps; i++) {
    const min = edges[i] + 1;
    const hi = edges[i + 1];
    if (min > hi) continue;
    const index = steps === 1 ? 2 : bottom + Math.round((i * (top - bottom)) / (steps - 1));
    out.push({ min, max: hi, color: ramp[index], label: min === hi ? `${min}` : `${min}–${hi}` });
  }
  return out;
}

export function bandColor(value: number, list: Band[]): string | null {
  return list.find((b) => value >= b.min && value <= b.max)?.color ?? null;
}

/** White or near-black text, whichever reads better on `hex`. */
export function readableOn(hex: string): string {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return luminance > 0.36 ? "#0b0b0b" : "#ffffff";
}

import cloud from "d3-cloud";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import type { WordCount } from "../../lib/types";

interface Placed {
  text: string;
  size: number;
  x?: number;
  y?: number;
  count: number;
  sources: number;
  rank: number;
}

const MAX_WORDS = 100;
const HEIGHT = 440;
const EMPHASIS = 10;

/** A repeatable random sequence, so the same words always land in the same places. */
function seeded(seed: number) {
  let state = seed % 2147483647 || 1;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

interface Props {
  words: WordCount[];
  selected: string | null;
  onSelect: (word: string) => void;
}

/** Word cloud: size carries frequency; the ten most frequent words take the accent colour. */
export function WordCloud({ words, selected, onSelect }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const font = useMemo(
    () => getComputedStyle(document.documentElement).getPropertyValue("--font-reading").trim() || "Georgia, serif",
    [],
  );

  useEffect(() => {
    if (!box.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(box.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (width < 200) return;
    const top = words.slice(0, MAX_WORDS);
    const max = top[0]?.count ?? 1;
    const min = top[top.length - 1]?.count ?? 1;
    const scale = (count: number) => (max === min ? 34 : 14 + (Math.sqrt(count - min) / Math.sqrt(max - min)) * 50);
    const layout = cloud<Placed>()
      .size([width, HEIGHT])
      .words(top.map((w, rank) => ({ text: w.word, size: scale(w.count), count: w.count, sources: w.sources, rank })))
      .padding(3)
      .rotate(0)
      .font(font)
      .fontWeight((w) => (w.rank < EMPHASIS ? 600 : 400))
      .fontSize((w) => w.size)
      .random(seeded(top.length * 7919 + width))
      .spiral("archimedean")
      .on("end", (result) => setPlaced(result));
    layout.start();
    return () => {
      layout.stop();
    };
  }, [words, width, font]);

  function onKey(event: KeyboardEvent, word: string) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect(word);
  }

  const dropped = Math.min(words.length, MAX_WORDS) - placed.length;

  return (
    <div ref={box} className="w-full">
      <svg
        width={width}
        height={HEIGHT}
        role="group"
        aria-label="Word cloud. Larger words appear more often; the table view lists exact counts."
      >
        <g transform={`translate(${width / 2},${HEIGHT / 2})`}>
          {placed.map((w) => {
            const active = w.text === selected;
            const fill = active || w.rank < EMPHASIS ? "var(--color-accent)" : w.rank < 40 ? "var(--color-ink)" : "var(--color-muted)";
            return (
              <text
                key={w.text}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                aria-label={`${w.text}, ${w.count} occurrences`}
                textAnchor="middle"
                transform={`translate(${w.x ?? 0},${w.y ?? 0})`}
                onClick={() => onSelect(w.text)}
                onKeyDown={(event) => onKey(event, w.text)}
                className="animate-fade cursor-pointer outline-none transition-opacity duration-150 hover:opacity-70 focus-visible:opacity-70"
                style={{
                  fontFamily: font,
                  fontSize: w.size,
                  fontWeight: w.rank < EMPHASIS ? 600 : 400,
                  fill,
                  textDecoration: active ? "underline" : undefined,
                  animationDelay: `${Math.min(w.rank, 30) * 12}ms`,
                }}
              >
                <title>{`${w.text}: ${w.count.toLocaleString()} times in ${w.sources} ${w.sources === 1 ? "source" : "sources"}`}</title>
                {w.text}
              </text>
            );
          })}
        </g>
      </svg>
      {dropped > 0 ? (
        <p className="mt-2 text-xs text-muted">{dropped} less frequent words did not fit. The table view lists them all.</p>
      ) : null}
    </div>
  );
}

import type { WordCount } from "../../lib/types";

interface Props {
  words: WordCount[];
  total: number;
  onSelect: (word: string) => void;
}

/** The table view: every value from the cloud and bars, readable without a chart. */
export function WordTable({ words, total, onSelect }: Props) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-line text-left text-xs text-muted">
          <th className="py-2 pr-3 font-medium">Word</th>
          <th className="py-2 pr-3 text-right font-medium">Count</th>
          <th className="py-2 pr-3 text-right font-medium">Sources</th>
          <th className="py-2 text-right font-medium">Share of words</th>
        </tr>
      </thead>
      <tbody>
        {words.map((w) => (
          <tr key={w.word} className="border-b border-line/60">
            <td className="py-1.5 pr-3">
              <button type="button" onClick={() => onSelect(w.word)} className="text-ink hover:text-accent hover:underline">
                {w.word}
              </button>
            </td>
            <td className="py-1.5 pr-3 text-right tabular-nums text-ink">{w.count.toLocaleString()}</td>
            <td className="py-1.5 pr-3 text-right tabular-nums text-muted">{w.sources}</td>
            <td className="py-1.5 text-right tabular-nums text-muted">{total ? ((w.count / total) * 100).toFixed(1) : "0.0"}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

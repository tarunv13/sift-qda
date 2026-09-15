import type { CodingMatrix } from "../../lib/types";

interface Props {
  matrix: CodingMatrix;
  onSelect: (row: number, column: number) => void;
}

/** The table twin of the heatmap: every count, readable without colour, with totals. */
export function MatrixTable({ matrix, onSelect }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="sticky left-0 bg-paper py-2 pr-4 font-medium">{matrix.themesOnly ? "Theme" : "Code"}</th>
            {matrix.columns.map((c) => (
              <th key={c.label} className="max-w-40 truncate px-2 py-2 text-right font-medium" title={c.label}>
                {c.label}
              </th>
            ))}
            <th className="px-2 py-2 text-right font-semibold text-ink">Total</th>
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row, r) => (
            <tr key={row.id} className="border-b border-line/60">
              <th scope="row" className="sticky left-0 max-w-72 truncate bg-paper py-1.5 pr-4 text-left font-normal text-ink" title={row.label}>
                <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ background: row.color }} />
                {row.label}
              </th>
              {matrix.cells[r].map((value, c) => (
                <td key={c} className="px-2 py-1.5 text-right tabular-nums">
                  {value > 0 ? (
                    <button type="button" onClick={() => onSelect(r, c)} className="rounded px-1 text-ink hover:bg-accent-soft hover:text-accent">
                      {value}
                    </button>
                  ) : (
                    <span className="text-muted/60">·</span>
                  )}
                </td>
              ))}
              <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-ink">{row.total}</td>
            </tr>
          ))}
          <tr className="text-xs text-muted">
            <th scope="row" className="sticky left-0 bg-paper py-2 pr-4 text-left font-semibold text-ink">
              Total
            </th>
            {matrix.columns.map((c) => (
              <td key={c.label} className="px-2 py-2 text-right font-semibold tabular-nums text-ink">
                {c.total}
              </td>
            ))}
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

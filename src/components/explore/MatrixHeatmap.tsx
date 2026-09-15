import type { EChartsCoreOption } from "echarts/core";
import { useMemo } from "react";

import { escapeHtml, useChartTokens } from "../../lib/charts";
import { bandColor, bands, readableOn } from "../../lib/ramp";
import type { CodingMatrix } from "../../lib/types";
import { useEChart } from "./useEChart";

const ROW = 34;

interface Props {
  matrix: CodingMatrix;
  onSelect: (row: number, column: number) => void;
}

/** Codes × columns as a heatmap: one sequential hue, 2px surface gaps, counts inside non-empty cells. */
export function MatrixHeatmap({ matrix, onSelect }: Props) {
  const t = useChartTokens();
  const columns = matrix.columns.length;
  const rotate = columns > 6;

  const option = useMemo<EChartsCoreOption>(() => {
    const dark = document.documentElement.dataset.theme === "dark";
    const max = Math.max(0, ...matrix.cells.flat());
    const pieces = bands(max, dark);
    const data = matrix.cells.flatMap((row, r) =>
      row.map((value, c) => {
        const fill = bandColor(value, pieces);
        return { value: [c, r, value], label: { show: value > 0, color: fill ? readableOn(fill) : t.muted } };
      }),
    );

    return {
      animationDuration: 280,
      grid: { left: 8, right: 16, top: rotate ? 72 : 36, bottom: 48, containLabel: true },
      xAxis: {
        type: "category",
        position: "top",
        data: matrix.columns.map((c) => c.label),
        axisTick: { show: false },
        axisLine: { show: false },
        splitArea: { show: false },
        axisLabel: { color: t.ink, fontFamily: t.font, fontSize: 12, interval: 0, rotate: rotate ? 30 : 0, width: 130, overflow: "truncate" },
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: matrix.rows.map((r) => r.label),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: t.ink, fontFamily: t.font, fontSize: 12, interval: 0, width: 240, overflow: "truncate" },
      },
      visualMap: {
        type: "piecewise",
        dimension: 2,
        pieces: pieces.map((b) => ({ min: b.min, max: b.max, color: b.color, label: b.label })),
        outOfRange: { color: t.panel },
        selectedMode: false,
        orient: "horizontal",
        left: "center",
        bottom: 4,
        itemWidth: 14,
        itemHeight: 10,
        textStyle: { color: t.muted, fontFamily: t.font, fontSize: 11 },
      },
      tooltip: {
        trigger: "item",
        backgroundColor: t.surface,
        borderColor: t.line,
        padding: [6, 10],
        textStyle: { color: t.ink, fontFamily: t.font, fontSize: 12 },
        formatter: (params: { value: number[] }) => {
          const [c, r, value] = params.value;
          const noun = value === 1 ? "passage" : "passages";
          return `<strong>${value}</strong> ${noun}<br/>${escapeHtml(matrix.rows[r].label)}<br/><span style="color:${t.muted}">${escapeHtml(matrix.columns[c].label)}</span>`;
        },
      },
      series: [
        {
          type: "heatmap",
          data,
          cursor: "pointer",
          itemStyle: { borderColor: t.surface, borderWidth: 2, borderRadius: 3 },
          emphasis: { itemStyle: { borderColor: t.ink, borderWidth: 1 } },
          label: { fontFamily: t.font, fontSize: 12 },
        },
      ],
    };
  }, [matrix, t, rotate]);

  const ref = useEChart(option, (index) => onSelect(Math.floor(index / columns), index % columns));
  return (
    <div
      ref={ref}
      role="img"
      aria-label={`Heatmap of ${matrix.rows.length} codes by ${columns} columns. Darker cells hold more coded passages; the table view lists every count.`}
      className="w-full"
      style={{ height: matrix.rows.length * ROW + (rotate ? 72 : 36) + 64, minWidth: Math.min(900, 260 + columns * 72) }}
    />
  );
}

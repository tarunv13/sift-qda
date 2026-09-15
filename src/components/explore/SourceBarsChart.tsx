import type { EChartsCoreOption } from "echarts/core";
import { useMemo } from "react";

import { escapeHtml, useChartTokens } from "../../lib/charts";
import { useEChart } from "./useEChart";

const ROW = 30;

interface Props {
  code: { label: string; color: string };
  bars: { label: string; value: number }[];
}

/** One code across every source, as horizontal bars in the code's colour with values at the tips. */
export function SourceBarsChart({ code, bars }: Props) {
  const t = useChartTokens();

  const option = useMemo<EChartsCoreOption>(
    () => ({
      animationDuration: 280,
      grid: { left: 4, right: 48, top: 4, bottom: 4, containLabel: true },
      xAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: t.line, width: 1 } },
        axisLabel: { color: t.muted, fontFamily: t.font, fontSize: 11 },
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: bars.map((b) => b.label),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: t.line } },
        axisLabel: { color: t.ink, fontFamily: t.font, fontSize: 12, width: 220, overflow: "truncate" },
      },
      tooltip: {
        trigger: "item",
        backgroundColor: t.surface,
        borderColor: t.line,
        padding: [6, 10],
        textStyle: { color: t.ink, fontFamily: t.font, fontSize: 12 },
        formatter: (params: { dataIndex: number }) => {
          const bar = bars[params.dataIndex];
          return `<strong>${bar.value}</strong> ${bar.value === 1 ? "passage" : "passages"}<br/>${escapeHtml(bar.label)}`;
        },
      },
      series: [
        {
          type: "bar",
          data: bars.map((b) => b.value),
          barMaxWidth: 18,
          itemStyle: { color: code.color, borderRadius: [0, 4, 4, 0] },
          label: { show: true, position: "right", color: t.muted, fontFamily: t.font, fontSize: 11 },
        },
      ],
    }),
    [bars, code.color, t],
  );

  const ref = useEChart(option);
  return (
    <div
      ref={ref}
      role="img"
      aria-label={`Bar chart of passages coded at ${code.label} in each source. The table view lists the same values.`}
      className="w-full"
      style={{ height: bars.length * ROW + 24 }}
    />
  );
}

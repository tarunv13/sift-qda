import type { EChartsCoreOption } from "echarts/core";
import { useMemo } from "react";

import { escapeHtml, useChartTokens } from "../../lib/charts";
import type { WordCount } from "../../lib/types";
import { useEChart } from "./useEChart";

const ROW = 26;

/** The most frequent words as horizontal bars. One series, so one colour and no legend. */
export function WordBars({ words, onSelect }: { words: WordCount[]; onSelect: (word: string) => void }) {
  const t = useChartTokens();

  const option = useMemo<EChartsCoreOption>(
    () => ({
      animationDuration: 280,
      animationEasing: "cubicOut",
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
        data: words.map((w) => w.word),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: t.line } },
        axisLabel: { color: t.ink, fontFamily: t.font, fontSize: 12 },
      },
      tooltip: {
        trigger: "item",
        backgroundColor: t.surface,
        borderColor: t.line,
        padding: [6, 10],
        textStyle: { color: t.ink, fontFamily: t.font, fontSize: 12 },
        formatter: (params: { dataIndex: number }) => {
          const w = words[params.dataIndex];
          const sources = `${w.sources} ${w.sources === 1 ? "source" : "sources"}`;
          return `<strong>${w.count.toLocaleString()}</strong> ${escapeHtml(w.word)}<br/><span style="color:${t.muted}">in ${sources}</span>`;
        },
      },
      series: [
        {
          type: "bar",
          data: words.map((w) => w.count),
          barMaxWidth: 18,
          cursor: "pointer",
          itemStyle: { color: t.accent, borderRadius: [0, 4, 4, 0] },
          emphasis: { itemStyle: { opacity: 0.8 } },
          label: { show: true, position: "right", color: t.muted, fontFamily: t.font, fontSize: 11 },
        },
      ],
    }),
    [words, t],
  );

  const ref = useEChart(option, (index) => onSelect(words[index].word));
  return (
    <div
      ref={ref}
      role="img"
      aria-label={`Bar chart of the ${words.length} most frequent words. The table view lists the same values.`}
      className="w-full"
      style={{ height: words.length * ROW + 16 }}
    />
  );
}

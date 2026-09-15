import type { EChartsCoreOption } from "echarts/core";
import { useMemo } from "react";

import { escapeHtml, useChartTokens } from "../../lib/charts";
import type { TreeDatum } from "../../lib/codeTree";
import { readableOn } from "../../lib/ramp";
import { useEChart } from "./useEChart";

export type HierarchyStyle = "treemap" | "sunburst";

interface Props {
  roots: TreeDatum[];
  style: HierarchyStyle;
  onSelect: (codeId: number) => void;
}

/** Every theme and code sized by its coded passages. Each block carries its code's name and colour. */
export function CodeHierarchyChart({ roots, style, onSelect }: Props) {
  const t = useChartTokens();

  const option = useMemo<EChartsCoreOption>(() => {
    const toData = (node: TreeDatum): Record<string, unknown> => ({
      id: node.id,
      name: node.name,
      value: node.value,
      own: node.own,
      itemStyle: { color: node.color },
      label: { color: readableOn(node.color) },
      children: node.children?.map(toData),
    });
    const tooltip = {
      trigger: "item",
      backgroundColor: t.surface,
      borderColor: t.line,
      padding: [6, 10],
      textStyle: { color: t.ink, fontFamily: t.font, fontSize: 12 },
      formatter: (params: { data: { name: string; value: number; own: number } }) => {
        const d = params.data;
        const direct = d.own === d.value ? "" : `<br/><span style="color:${t.muted}">${d.own} coded directly</span>`;
        return `<strong>${d.value}</strong> ${d.value === 1 ? "passage" : "passages"}<br/>${escapeHtml(d.name)}${direct}`;
      },
    };
    const data = roots.map(toData);
    const font = { fontFamily: t.font, fontSize: 12 };

    const series =
      style === "treemap"
        ? {
            type: "treemap",
            data,
            roam: false,
            nodeClick: false,
            breadcrumb: { show: false },
            width: "100%",
            height: "100%",
            label: { show: true, ...font, formatter: "{b}\n{c}", overflow: "truncate" },
            // Theme headers sit on the surface-coloured border strip, so they use ink, not the block colour.
            upperLabel: { show: true, height: 22, ...font, color: t.ink, formatter: "{b}  {c}" },
            itemStyle: { borderColor: t.surface, borderWidth: 2, gapWidth: 2 },
            levels: [
              { upperLabel: { show: false }, itemStyle: { borderWidth: 0, gapWidth: 6 } },
              { itemStyle: { borderColor: t.surface, borderWidth: 3, gapWidth: 2 } },
              { itemStyle: { borderColor: t.surface, borderWidth: 2, gapWidth: 2 } },
            ],
          }
        : {
            type: "sunburst",
            data,
            radius: ["14%", "94%"],
            nodeClick: false,
            sort: undefined,
            itemStyle: { borderColor: t.surface, borderWidth: 2 },
            label: { ...font, rotate: "tangential", minAngle: 12, overflow: "truncate", width: 90 },
            emphasis: { focus: "ancestor" },
          };

    return { animationDuration: 300, tooltip, series: [{ ...series, cursor: "pointer" }] };
  }, [roots, style, t]);

  const ref = useEChart(option, (_index, click) => {
    const id = (click.data as { id?: number } | undefined)?.id;
    if (typeof id === "number") onSelect(id);
  });

  return (
    <div
      ref={ref}
      role="img"
      aria-label={`${style === "treemap" ? "Treemap" : "Sunburst"} of codes sized by coded passages. The table view lists every count.`}
      className="w-full"
      style={{ height: style === "treemap" ? 520 : 560 }}
    />
  );
}

import type { EChartsCoreOption } from "echarts/core";
import { useEffect, useMemo, useRef, useState } from "react";

import { escapeHtml, useChartTokens } from "../../lib/charts";
import type { MapNode, ProjectMap } from "../../lib/projectMap";
import { useEChart } from "./useEChart";

interface Props {
  map: ProjectMap;
  /** What the square nodes are: "source" or "case". */
  placeWord: string;
  onOpen: (node: MapNode) => void;
}

const passages = (n: number) => `${n} ${n === 1 ? "passage" : "passages"}`;

/**
 * The project as a map: every code joined to the sources or cases it is coded in, and to the
 * code it sits under. Drag a node to untangle a corner, scroll to zoom, click to open the thing
 * itself.
 */
export function ProjectMapChart({ map, placeWord, onOpen }: Props) {
  const t = useChartTokens();
  const frame = useRef<HTMLDivElement>(null);
  const [span, setSpan] = useState(420);

  // The pane is a narrow column on a laptop and half a screen on a monitor, so the forces that
  // hold the map together are measured from the space it actually has, in steps to avoid churn.
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      const smaller = Math.min(element.clientWidth, element.clientHeight);
      if (smaller > 0) setSpan(Math.round(smaller / 40) * 40);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Below this the map lives in the middle column of a laptop window rather than a wide pane.
  const tight = span < 520;

  const option = useMemo<EChartsCoreOption>(() => {
    const radius = (value: number) => 9 + 22 * Math.sqrt(value / map.peak);
    const font = { fontFamily: t.font, fontSize: 11 };

    const data = map.nodes.map((node) => ({
      name: node.name,
      value: node.value,
      mapKind: node.kind,
      path: node.path,
      symbol: node.kind === "code" ? "circle" : "roundRect",
      symbolSize: node.kind === "code" ? radius(node.value) : [radius(node.value) * 1.5, radius(node.value) * 0.9],
      itemStyle:
        node.kind === "code"
          ? { color: node.color, borderColor: t.surface, borderWidth: 1.5 }
          : { color: t.panel, borderColor: t.muted, borderWidth: 1.5 },
      label: { color: node.kind === "code" ? t.ink : t.muted },
    }));

    const links = map.links.map((link) => ({
      source: link.from,
      target: link.to,
      value: link.value,
      lineStyle: {
        color: link.nested ? t.line : link.color,
        width: link.nested ? 1 : 1 + 2.5 * Math.sqrt(link.value / map.peak),
        opacity: link.nested ? 0.9 : 0.55,
        type: link.nested ? "dashed" : "solid",
        curveness: 0.06,
      },
    }));

    return {
      animationDuration: 300,
      tooltip: {
        trigger: "item",
        backgroundColor: t.surface,
        borderColor: t.line,
        padding: [6, 10],
        textStyle: { color: t.ink, fontFamily: t.font, fontSize: 12 },
        formatter: (params: { dataType?: string; dataIndex: number }) => {
          if (params.dataType === "edge") {
            const link = map.links[params.dataIndex];
            const from = map.nodes[link.from];
            const to = map.nodes[link.to];
            const what = link.nested ? "coded at or beneath" : "coded in";
            return `<strong>${passages(link.value)}</strong><br/>${escapeHtml(to.path)}<br/><span style="color:${t.muted}">${what} ${escapeHtml(from.name)}</span>`;
          }
          const node = map.nodes[params.dataIndex];
          const kind = node.kind === "code" ? "code" : placeWord;
          return `<strong>${passages(node.value)}</strong><br/>${escapeHtml(node.path)}<br/><span style="color:${t.muted}">${kind} · click to open</span>`;
        },
      },
      series: [
        {
          type: "graph",
          layout: "force",
          // Room at the edges, and more at the foot, so the label under a node is never clipped.
          left: 64,
          right: 64,
          top: 26,
          bottom: 66,
          data,
          links,
          roam: true,
          draggable: true,
          cursor: "pointer",
          force: {
            // A circular start, so the same project always settles into the same picture.
            initLayout: "circular",
            // A narrow column has to be held together; given room, the map spreads out instead
            // of knotting in the middle.
            repulsion: span * (tight ? 0.6 : 1.1),
            edgeLength: tight ? [span * 0.12, span * 0.3] : [span * 0.18, span * 0.38],
            gravity: tight ? 0.16 : 0.07,
            friction: 0.3,
          },
          label: { show: true, position: "bottom", distance: 5, ...font, formatter: (p: { name: string }) => (p.name.length > 24 ? `${p.name.slice(0, 23)}…` : p.name) },
          labelLayout: { hideOverlap: true, moveOverlap: "shiftY" },
          emphasis: { focus: "adjacency", scale: 1.06, label: { ...font, fontWeight: "bold" } },
          blur: { itemStyle: { opacity: 0.25 }, lineStyle: { opacity: 0.12 }, label: { opacity: 0.25 } },
        },
      ],
    };
  }, [map, placeWord, span, t, tight]);

  const codes = map.nodes.filter((n) => n.kind === "code").length;
  const places = map.nodes.length - codes;

  const ref = useEChart(option, (index, click) => {
    const kind = (click.data as { mapKind?: string } | undefined)?.mapKind;
    if (kind === "code" || kind === "place") onOpen(map.nodes[index]);
  });

  return (
    <div ref={frame} className="h-full min-h-[340px] w-full">
      <div
        ref={ref}
        role="img"
        aria-label={`Map of ${codes} ${codes === 1 ? "code" : "codes"} and ${places} ${places === 1 ? placeWord : `${placeWord}s`}, joined by where each code is used. The table view lists the same counts.`}
        className="h-full w-full"
      />
    </div>
  );
}

import type { EChartsCoreOption, EChartsType } from "echarts/core";
import { useEffect, useRef } from "react";

import { echarts } from "../../lib/charts";

export interface ChartClick {
  dataIndex: number;
  data?: unknown;
}

/** Mounts an ECharts instance on a div, follows the div's size, and applies each new option. */
export function useEChart(option: EChartsCoreOption, onSelect?: (dataIndex: number, click: ChartClick) => void) {
  const element = useRef<HTMLDivElement>(null);
  const chart = useRef<EChartsType | null>(null);
  const select = useRef(onSelect);
  const latest = useRef(option);
  const unsized = useRef(true);

  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    latest.current = option;
  }, [option]);

  useEffect(() => {
    if (!element.current) return;
    const instance = echarts.init(element.current, null, { renderer: "svg" });
    chart.current = instance;
    instance.on("click", (params) => {
      if (typeof params.dataIndex === "number") select.current?.(params.dataIndex, { dataIndex: params.dataIndex, data: params.data });
    });
    // Explore keeps every tab mounted, so a chart can be laid out while its tab is hidden and has
    // no size. Re-apply the option the first time it does have one, or a force layout stays wrong.
    const observer = new ResizeObserver((entries) => {
      const box = entries[entries.length - 1]?.contentRect;
      instance.resize();
      const sized = !!box && box.width > 0 && box.height > 0;
      if (sized && unsized.current) instance.setOption(latest.current, { notMerge: true });
      unsized.current = !sized;
    });
    observer.observe(element.current);
    return () => {
      observer.disconnect();
      instance.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    chart.current?.setOption(option, { notMerge: true });
  }, [option]);

  return element;
}

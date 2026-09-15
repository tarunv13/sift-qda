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

  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!element.current) return;
    const instance = echarts.init(element.current, null, { renderer: "svg" });
    chart.current = instance;
    instance.on("click", (params) => {
      if (typeof params.dataIndex === "number") select.current?.(params.dataIndex, { dataIndex: params.dataIndex, data: params.data });
    });
    const observer = new ResizeObserver(() => instance.resize());
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

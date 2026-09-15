// Apache ECharts, registered piece by piece so only the chart types Sift QDA uses are bundled.
import { BarChart, HeatmapChart } from "echarts/charts";
import { GridComponent, TooltipComponent, VisualMapPiecewiseComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { useEffect, useState } from "react";

echarts.use([BarChart, HeatmapChart, GridComponent, TooltipComponent, VisualMapPiecewiseComponent, SVGRenderer]);

export { echarts };

export interface ChartTokens {
  surface: string;
  panel: string;
  line: string;
  ink: string;
  muted: string;
  accent: string;
  font: string;
}

function readTokens(): ChartTokens {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  return {
    surface: token("--color-surface"),
    panel: token("--color-panel"),
    line: token("--color-line"),
    ink: token("--color-ink"),
    muted: token("--color-muted"),
    accent: token("--color-accent"),
    font: token("--font-ui"),
  };
}

/** Theme colours for charts, refreshed whenever the app switches between light and dark. */
export function useChartTokens(): ChartTokens {
  const [tokens, setTokens] = useState(readTokens);
  useEffect(() => {
    const observer = new MutationObserver(() => setTokens(readTokens()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return tokens;
}

/** Words and names come from research documents, so escape them before ECharts renders tooltip HTML. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

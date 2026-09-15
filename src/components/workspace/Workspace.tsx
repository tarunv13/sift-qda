import { lazy, Suspense } from "react";

import { SourcePane } from "../editor/SourcePane";
import { RightPanel } from "../panels/RightPanel";
import { Sidebar } from "../sidebar/Sidebar";
import { useFirstRunTour } from "../tour/TourContext";
import { useProject } from "../../state/ProjectContext";
import { StatusBar } from "./StatusBar";

// ECharts and d3-cloud are large; load them only when Explore is first opened.
const ExplorePane = lazy(() => import("../explore/ExplorePane").then((m) => ({ default: m.ExplorePane })));

export function Workspace() {
  const { view } = useProject();
  useFirstRunTour("workspace");
  return (
    <div data-tour="workspace" className="grid h-full grid-cols-[272px_minmax(0,1fr)_360px] grid-rows-[minmax(0,1fr)_auto]">
      <Sidebar />
      {view === "explore" ? (
        <Suspense fallback={<main className="animate-breathe m-5 rounded-xl bg-panel" />}>
          <ExplorePane />
        </Suspense>
      ) : (
        <SourcePane />
      )}
      <RightPanel />
      <StatusBar />
    </div>
  );
}

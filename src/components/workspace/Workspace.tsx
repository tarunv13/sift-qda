import { SourcePane } from "../editor/SourcePane";
import { RightPanel } from "../panels/RightPanel";
import { Sidebar } from "../sidebar/Sidebar";
import { StatusBar } from "./StatusBar";

export function Workspace() {
  return (
    <div className="grid h-full grid-cols-[272px_minmax(0,1fr)_360px] grid-rows-[minmax(0,1fr)_auto]">
      <Sidebar />
      <SourcePane />
      <RightPanel />
      <StatusBar />
    </div>
  );
}

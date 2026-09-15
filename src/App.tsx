import { Notices } from "./components/common/Notices";
import { ProjectHome } from "./components/projects/ProjectHome";
import { TourProvider } from "./components/tour/TourContext";
import { TourOverlay } from "./components/tour/TourOverlay";
import { Workspace } from "./components/workspace/Workspace";
import { ProjectProvider, useProject } from "./state/ProjectContext";

function Shell() {
  const { project } = useProject();
  return project ? <Workspace key={project.id} /> : <ProjectHome />;
}

export default function App() {
  return (
    <ProjectProvider>
      <TourProvider>
        <Shell />
        <Notices />
        <TourOverlay />
      </TourProvider>
    </ProjectProvider>
  );
}

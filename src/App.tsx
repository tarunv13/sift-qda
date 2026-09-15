import { Notices } from "./components/common/Notices";
import { ProjectHome } from "./components/projects/ProjectHome";
import { Workspace } from "./components/workspace/Workspace";
import { ProjectProvider, useProject } from "./state/ProjectContext";

function Shell() {
  const { project } = useProject();
  return project ? <Workspace key={project.id} /> : <ProjectHome />;
}

export default function App() {
  return (
    <ProjectProvider>
      <Shell />
      <Notices />
    </ProjectProvider>
  );
}

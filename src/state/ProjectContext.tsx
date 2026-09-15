import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { api, errorMessage } from "../lib/api";
import type { CodeNode, Project, SourceSummary } from "../lib/types";

export interface Notice {
  id: number;
  message: string;
  tone: "info" | "success" | "error";
}

/** A request to select and scroll to a span of a source. */
export interface Focus {
  sourceId: number;
  start: number;
  end: number;
  nonce: number;
}

interface ProjectState {
  project: Project | null;
  openProject: (project: Project | null) => void;
  sources: SourceSummary[];
  nodes: CodeNode[];
  sourceId: number | null;
  selectSource: (id: number | null) => void;
  nodeId: number | null;
  selectNode: (id: number | null) => void;
  focus: Focus | null;
  reveal: (sourceId: number, start: number, end: number) => void;
  refresh: () => Promise<void>;
  /** Bumped whenever coding references change anywhere. */
  referencesVersion: number;
  referencesChanged: () => void;
  notices: Notice[];
  notify: (message: string, tone?: Notice["tone"]) => void;
  dismiss: (id: number) => void;
  /** Awaits a command, reporting failures as a notice. Resolves undefined on error. */
  run: <T>(task: Promise<T>) => Promise<T | undefined>;
}

const Context = createContext<ProjectState | null>(null);
let nextNoticeId = 1;
let nextNonce = 1;

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<Project | null>(null);
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [nodes, setNodes] = useState<CodeNode[]>([]);
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [nodeId, setNodeId] = useState<number | null>(null);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [referencesVersion, setReferencesVersion] = useState(0);
  const [notices, setNotices] = useState<Notice[]>([]);

  const dismiss = useCallback((id: number) => {
    setNotices((all) => all.filter((n) => n.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, tone: Notice["tone"] = "info") => {
      const id = nextNoticeId++;
      setNotices((all) => [...all.slice(-3), { id, message, tone }]);
      if (tone !== "error") setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const run = useCallback(
    async function <T>(task: Promise<T>): Promise<T | undefined> {
      try {
        return await task;
      } catch (error) {
        notify(errorMessage(error), "error");
        return undefined;
      }
    },
    [notify],
  );

  const refresh = useCallback(async () => {
    if (!project) return;
    const loaded = await run(Promise.all([api.listSources(project.id), api.listNodes(project.id)]));
    if (!loaded) return;
    setSources(loaded[0]);
    setNodes(loaded[1]);
  }, [project, run]);

  useEffect(() => {
    setSourceId(null);
    setNodeId(null);
    setFocus(null);
    setSources([]);
    setNodes([]);
    void refresh();
  }, [refresh]);

  const referencesChanged = useCallback(() => {
    setReferencesVersion((v) => v + 1);
    void refresh();
  }, [refresh]);

  const reveal = useCallback((id: number, start: number, end: number) => {
    setSourceId(id);
    setFocus({ sourceId: id, start, end, nonce: nextNonce++ });
  }, []);

  const value = useMemo<ProjectState>(
    () => ({
      project,
      openProject: setProject,
      sources,
      nodes,
      sourceId,
      selectSource: setSourceId,
      nodeId,
      selectNode: setNodeId,
      focus,
      reveal,
      refresh,
      referencesVersion,
      referencesChanged,
      notices,
      notify,
      dismiss,
      run,
    }),
    [project, sources, nodes, sourceId, nodeId, focus, reveal, refresh, referencesVersion, referencesChanged, notices, notify, dismiss, run],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useProject(): ProjectState {
  const state = useContext(Context);
  if (!state) throw new Error("useProject must be used inside ProjectProvider");
  return state;
}

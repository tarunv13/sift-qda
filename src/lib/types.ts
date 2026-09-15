// Mirrors the serialised Rust structs (serde camelCase). Offsets are code points.

export interface Project {
  id: number;
  guid: string;
  name: string;
  description: string;
  createdAt: string;
}

export type SourceKind = "text" | "docx" | "pdf" | "xlsx";

export interface SourceSummary {
  id: number;
  name: string;
  kind: SourceKind;
  referenceCount: number;
  createdAt: string;
}

export interface PageRange {
  page: number;
  start: number;
  end: number;
}

export interface Source {
  id: number;
  guid: string;
  projectId: number;
  name: string;
  kind: SourceKind;
  filePath: string | null;
  content: string;
  metadata: Record<string, unknown>;
  pages: PageRange[];
}

export interface CodeNode {
  id: number;
  guid: string;
  parentId: number | null;
  name: string;
  color: string;
  description: string;
  referenceCount: number;
  sourceCount: number;
}

export interface CodingReference {
  id: number;
  sourceId: number;
  nodeId: number;
  startIndex: number;
  endIndex: number;
  nodeName: string;
  color: string;
}

export interface QuotedReference extends CodingReference {
  sourceName: string;
  text: string;
}

export interface Memo {
  id: number;
  projectId: number;
  sourceId: number | null;
  nodeId: number | null;
  title: string;
  body: string;
  updatedAt: string;
}

export interface CaseTable {
  attributes: { id: number; name: string; valueType: string }[];
  cases: { id: number; name: string; sourceId: number | null; values: string[] }[];
}

export interface SearchHit {
  sourceId: number;
  sourceName: string;
  start: number;
  end: number;
  snippet: string;
  score: number;
}

export interface IndexStatus {
  total: number;
  pending: number;
  running: boolean;
}

export interface EmbeddingConfig {
  url: string;
  model: string;
}

export interface EmbeddingStatus {
  state: "idle" | "running" | "offline";
  remaining: number;
  message: string | null;
}

export interface ImportOutcome {
  path: string;
  name: string;
  sourceId: number | null;
  error: string | null;
}

export interface ImportSummary {
  projectId: number;
  sources: number;
  codes: number;
  references: number;
  memos: number;
  cases: number;
  skipped: number;
}

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
  caseId: number | null;
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

/** Which text an Explore analysis reads. */
export type AnalysisScope = { kind: "project" } | { kind: "source"; id: number } | { kind: "code"; id: number };

export interface WordOptions {
  minLength: number;
  language: "en" | "hi" | "en+hi" | "none";
  extraStopWords: string[];
  skipSpeakers: boolean;
  limit: number;
}

export interface WordCount {
  word: string;
  count: number;
  sources: number;
}

export interface WordFrequency {
  words: WordCount[];
  totalWords: number;
  distinctWords: number;
}

export interface KeywordContext {
  sourceId: number;
  sourceName: string;
  start: number;
  end: number;
  before: string;
  matched: string;
  after: string;
}

export type MatrixColumns = { kind: "sources" } | { kind: "cases" } | { kind: "attribute"; id: number };

export interface MatrixSpec {
  themesOnly: boolean;
  columns: MatrixColumns;
}

export interface CodingMatrix {
  rows: { id: number; label: string; color: string; total: number }[];
  columns: { label: string; sourceIds: number[]; total: number }[];
  /** cells[row][column]: coded passages. */
  cells: number[][];
  unlinkedCases: number;
  themesOnly: boolean;
}

export interface CellPassage {
  sourceId: number;
  sourceName: string;
  start: number;
  end: number;
  text: string;
  codeName: string;
  color: string;
}

export type { QueryHit, QueryOperator, QueryResult, QuerySpec } from "./queryTypes";
export type { Annotation, PassageLink, SourceNotes } from "./noteTypes";

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

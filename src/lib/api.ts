// Typed wrappers around the Rust commands. The frontend never parses files or touches SQLite.
import { invoke } from "@tauri-apps/api/core";
import type {
  AnalysisScope,
  CaseTable,
  CellPassage,
  CodingMatrix,
  CodeNode,
  CodingReference,
  EmbeddingConfig,
  ImportOutcome,
  ImportSummary,
  IndexStatus,
  KeywordContext,
  MatrixSpec,
  Memo,
  QueryResult,
  QuerySpec,
  Project,
  QuotedReference,
  SearchHit,
  Source,
  SourceSummary,
  WordFrequency,
  WordOptions,
} from "./types";

export const api = {
  // Projects
  listProjects: () => invoke<Project[]>("list_projects"),
  createProject: (name: string, description?: string) =>
    invoke<Project>("create_project", { name, description }),
  renameProject: (id: number, name: string) => invoke<Project>("rename_project", { id, name }),
  deleteProject: (id: number) => invoke<void>("delete_project", { id }),

  // Sources
  listSources: (projectId: number) => invoke<SourceSummary[]>("list_sources", { projectId }),
  getSource: (id: number) => invoke<Source>("get_source", { id }),
  readSourceBytes: (id: number) => invoke<ArrayBuffer>("read_source_bytes", { id }),
  importSourceFiles: (projectId: number, paths: string[]) =>
    invoke<ImportOutcome[]>("import_source_files", { projectId, paths }),
  renameSource: (id: number, name: string) => invoke<void>("rename_source", { id, name }),
  deleteSource: (id: number) => invoke<void>("delete_source", { id }),

  // Codes and coding
  listNodes: (projectId: number) => invoke<CodeNode[]>("list_nodes", { projectId }),
  createNode: (projectId: number, name: string, color: string, parentId: number | null) =>
    invoke<CodeNode>("create_node", { projectId, name, color, parentId }),
  updateNode: (node: Pick<CodeNode, "id" | "name" | "color" | "description" | "parentId">) =>
    invoke<CodeNode>("update_node", node),
  deleteNode: (id: number) => invoke<void>("delete_node", { id }),
  saveCodingReference: (sourceId: number, startIndex: number, endIndex: number, codeId: number) =>
    invoke<CodingReference>("save_coding_reference", { sourceId, startIndex, endIndex, codeId }),
  listSourceReferences: (sourceId: number) =>
    invoke<CodingReference[]>("list_source_references", { sourceId }),
  listNodeReferences: (nodeId: number) =>
    invoke<QuotedReference[]>("list_node_references", { nodeId }),
  deleteCodingReference: (id: number) => invoke<void>("delete_coding_reference", { id }),

  // Memos and cases
  listMemos: (projectId: number) => invoke<Memo[]>("list_memos", { projectId }),
  createMemo: (projectId: number, title: string, sourceId?: number | null) =>
    invoke<Memo>("create_memo", { projectId, title, sourceId }),
  updateMemo: (id: number, title: string, body: string) =>
    invoke<Memo>("update_memo", { id, title, body }),
  deleteMemo: (id: number) => invoke<void>("delete_memo", { id }),
  getCaseTable: (projectId: number) => invoke<CaseTable>("get_case_table", { projectId }),

  // Search and local AI
  semanticSearch: (projectId: number, query: string, limit = 20) =>
    invoke<SearchHit[]>("semantic_search", { projectId, query, limit }),
  textSearch: (projectId: number, query: string) =>
    invoke<SearchHit[]>("text_search", { projectId, query }),
  embeddingStatus: () => invoke<IndexStatus>("embedding_status"),
  getEmbeddingConfig: () => invoke<EmbeddingConfig>("get_embedding_config"),
  setEmbeddingConfig: (config: EmbeddingConfig) => invoke<void>("set_embedding_config", { config }),
  reindexEmbeddings: () => invoke<void>("reindex_embeddings"),

  // Explore
  wordFrequency: (projectId: number, scope: AnalysisScope, options: WordOptions) =>
    invoke<WordFrequency>("word_frequency", { projectId, scope, options }),
  keywordContexts: (projectId: number, scope: AnalysisScope, word: string, skipSpeakers: boolean) =>
    invoke<KeywordContext[]>("keyword_contexts", { projectId, scope, word, skipSpeakers }),
  codingMatrix: (projectId: number, spec: MatrixSpec) => invoke<CodingMatrix>("coding_matrix", { projectId, spec }),
  matrixCellPassages: (projectId: number, codeId: number, rolledUp: boolean, sourceIds: number[]) =>
    invoke<CellPassage[]>("matrix_cell_passages", { projectId, codeId, rolledUp, sourceIds }),
  exportMatrixExcel: (projectId: number, spec: MatrixSpec, path: string) =>
    invoke<void>("export_matrix_excel", { projectId, spec, path }),
  codingQuery: (projectId: number, spec: QuerySpec) => invoke<QueryResult>("coding_query", { projectId, spec }),
  codeQueryResults: (projectId: number, spec: QuerySpec, name: string, color: string) =>
    invoke<number>("code_query_results", { projectId, spec, name, color }),

  // REFI-QDA
  importQdpx: (path: string) => invoke<ImportSummary>("import_qdpx", { path }),
  exportQdpx: (projectId: number, path: string) => invoke<void>("export_qdpx", { projectId, path }),

  // Excel
  exportExcel: (projectId: number, path: string) => invoke<void>("export_excel", { projectId, path }),
};

/** Tauri rejects with the serialised AppError string; normalise anything else. */
export function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return JSON.stringify(error);
}

/** What the local assistant summarises. */
export type AssistTarget = { kind: "source" | "code" | "case"; id: number };

/** A sub-code proposed by the local model; nothing is created until accepted. */
export interface CodeSuggestion {
  name: string;
  description: string;
}

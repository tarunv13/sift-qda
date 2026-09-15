export type QueryOperator = "only" | "and" | "or" | "not" | "near";

export interface QuerySpec {
  a: number;
  operator: QueryOperator;
  b: number | null;
  /** Characters allowed between passages for "near". */
  distance: number;
  includeSubCodes: boolean;
  filter: { attributeId: number; value: string } | null;
}

export interface QueryHit {
  sourceId: number;
  sourceName: string;
  start: number;
  end: number;
  text: string;
}

export interface QueryResult {
  hits: QueryHit[];
  sources: number;
  truncated: boolean;
}

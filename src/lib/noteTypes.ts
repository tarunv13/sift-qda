export interface Annotation {
  id: number;
  sourceId: number;
  start: number;
  end: number;
  body: string;
  text: string;
  createdAt: string;
}

export interface PassageLink {
  id: number;
  /** True when the link starts at the open source's passage. */
  outgoing: boolean;
  hereStart: number;
  hereEnd: number;
  hereText: string;
  otherSourceId: number;
  otherSourceName: string;
  thereStart: number;
  thereEnd: number;
  thereText: string;
}

export interface SourceNotes {
  annotations: Annotation[];
  links: PassageLink[];
}

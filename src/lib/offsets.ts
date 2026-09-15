// The editor document is one paragraph per line of `source.content`. ProseMirror
// positions count UTF-16 units plus paragraph boundary tokens; the database stores
// Unicode code-point offsets. These helpers convert between the two.
import type { Node as PMNode } from "@tiptap/pm/model";

import type { PageRange } from "./types";

export function cpLength(text: string): number {
  return Array.from(text).length;
}

/** PDF page containing a code-point offset (1 when the source has no pages). */
export function pageAt(pages: PageRange[], offset: number): number {
  let page = pages[0]?.page ?? 1;
  for (const range of pages) {
    if (range.start <= offset) page = range.page;
    if (offset <= range.end && range.start <= offset) return range.page;
  }
  return page;
}

function utf16ToCp(text: string, index: number): number {
  return cpLength(text.slice(0, index));
}

function cpToUtf16(text: string, cp: number): number {
  let units = 0;
  let count = 0;
  for (const ch of text) {
    if (count === cp) break;
    units += ch.length;
    count++;
  }
  return units;
}

export interface ParagraphIndex {
  texts: string[];
  /** Code-point offset where each paragraph starts. */
  cpStarts: number[];
  /** ProseMirror position of each paragraph's opening token. */
  posStarts: number[];
  total: number;
}

export function indexParagraphs(content: string): ParagraphIndex {
  const texts = content.split("\n");
  const cpStarts: number[] = [];
  const posStarts: number[] = [];
  let cp = 0;
  let pos = 0;
  for (const text of texts) {
    cpStarts.push(cp);
    posStarts.push(pos);
    cp += cpLength(text) + 1;
    pos += text.length + 2;
  }
  return { texts, cpStarts, posStarts, total: Math.max(0, cp - 1) };
}

/** ProseMirror position → code-point offset into the source content. */
export function posToOffset(doc: PMNode, pos: number, index: ParagraphIndex): number {
  const $pos = doc.resolve(pos);
  const paragraph = $pos.index(0);
  if (paragraph >= index.texts.length) return index.total;
  if ($pos.depth === 0) return index.cpStarts[paragraph];
  return index.cpStarts[paragraph] + utf16ToCp(index.texts[paragraph], $pos.parentOffset);
}

/** Code-point offset → ProseMirror position (inside the containing paragraph). */
export function offsetToPos(offset: number, index: ParagraphIndex): number {
  let paragraph = index.cpStarts.length - 1;
  while (paragraph > 0 && index.cpStarts[paragraph] > offset) paragraph--;
  const text = index.texts[paragraph] ?? "";
  const within = Math.min(Math.max(0, offset - index.cpStarts[paragraph]), cpLength(text));
  return index.posStarts[paragraph] + 1 + cpToUtf16(text, within);
}

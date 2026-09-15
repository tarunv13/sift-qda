// The small part of d3-cloud (BSD-3-Clause) that Sift QDA uses. Declared locally because the
// published @types/d3-cloud pulls in the whole of D3 v3's types.
declare module "d3-cloud" {
  export interface CloudWord {
    text: string;
    size: number;
    x?: number;
    y?: number;
    rotate?: number;
  }

  export interface Cloud<T extends CloudWord> {
    size(size: [number, number]): Cloud<T>;
    words(words: T[]): Cloud<T>;
    padding(padding: number): Cloud<T>;
    rotate(rotate: number | ((word: T, index: number) => number)): Cloud<T>;
    font(font: string): Cloud<T>;
    fontWeight(weight: string | number | ((word: T, index: number) => string | number)): Cloud<T>;
    fontSize(size: (word: T, index: number) => number): Cloud<T>;
    random(random: () => number): Cloud<T>;
    spiral(name: "archimedean" | "rectangular"): Cloud<T>;
    on(type: "end", listener: (placed: T[]) => void): Cloud<T>;
    start(): Cloud<T>;
    stop(): Cloud<T>;
  }

  export default function cloud<T extends CloudWord>(): Cloud<T>;
}

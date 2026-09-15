/** Places overlapping spans side by side: each gets the first lane free at its start. */
export function assignLanes<T extends { startIndex: number; endIndex: number }>(items: T[]): { item: T; lane: number }[] {
  const laneEnds: number[] = [];
  return [...items]
    .sort((a, b) => a.startIndex - b.startIndex || b.endIndex - a.endIndex)
    .map((item) => {
      let lane = laneEnds.findIndex((end) => end <= item.startIndex);
      if (lane === -1) lane = laneEnds.push(0) - 1;
      laneEnds[lane] = item.endIndex;
      return { item, lane };
    });
}

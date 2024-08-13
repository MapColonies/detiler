import { Metric } from './metric';

export interface BasicHttpStat {
  count: number;
  average?: number;
  lastInvoke?: number;
}

export interface Stats {
  currentlyRenderedTiles: number;
  totalTilesRendered: number;
  uniqueTilesRendered: Set<string>;
  mapRendersCount: number;
  metric?: Metric;
  httpInvokes: {
    query: BasicHttpStat;
    kits: BasicHttpStat;
    tile: BasicHttpStat;
  };
}

export const INIT_STATS: Stats = {
  mapRendersCount: 0,
  totalTilesRendered: 0,
  currentlyRenderedTiles: 0,
  uniqueTilesRendered: new Set(),
  httpInvokes: {
    kits: {
      count: 0,
    },
    query: {
      count: 0,
    },
    tile: {
      count: 0,
    },
  },
};

export const calcHttpStat = (prevStat: BasicHttpStat, duration: number): BasicHttpStat => {
  const lastTotal = (prevStat.average ?? 0) * prevStat.count;
  const nextCount = prevStat.count + 1;
  const nextAverage = (lastTotal + duration) / nextCount;
  return { count: nextCount, average: nextAverage, lastInvoke: Date.now() };
};

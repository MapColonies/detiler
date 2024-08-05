import { Feature } from 'geojson';
import { differenceWith } from 'lodash';
import { insertDummyFeature, removeDummyFeature } from '../utils/helpers';
import { Stats } from '../utils/stats';
import { Metric } from '../utils/metric';
import { normalizeValue } from '../utils/style';
import { MAX_ZOOM_LEVEL, ZOOM_OFFEST } from '../utils/constants';
import { AppHelper } from '../utils/interfaces';

type TransformFunc<T> = (data: T) => T;

type ComparatorFunc<T> = (nextData: T, prevData: T) => boolean;

export const transformFuncWrapper = (metric: Metric | undefined): TransformFunc<Feature[]> => {
  const transformFunc = (data: Feature[]): Feature[] => {
    if (metric !== undefined) {
      data.forEach((feature) => {
        if (feature.properties !== null) {
          const value = feature.properties[metric.property] as number;
          const normalizedValue = normalizeValue(value, metric.range);
          feature.properties['score'] = normalizedValue;
        }
      });
    }

    // to accomplish rendering empty data
    if (data.length === 0) {
      insertDummyFeature(data);
    }

    return data;
  };

  return transformFunc;
};

export const comparatorFuncWrapper = (helper: AppHelper, setStatsTable: (value: React.SetStateAction<Stats>) => void): ComparatorFunc<Feature[]> => {
  const comparatorFunc = (nextData: Feature[], prevData: Feature[]): boolean => {
    let shouldSkipRedering = false;
    // render if override flag is enabled or next data is greater than prev
    if (helper.shouldOverrideComarator || prevData.length < nextData.length) {
      helper.shouldOverrideComarator = false;
    } else {
      // render if new data is not contained in prev data
      const comparator = (tile1: Feature, tile2: Feature): boolean => tile1.properties?.id === tile2.properties?.id;
      const difference = differenceWith(nextData, prevData, comparator);
      shouldSkipRedering = difference.length === 0;
    }

    if (!shouldSkipRedering) {
      removeDummyFeature(nextData);

      setStatsTable((prevStatsTable) => {
        const nextMapRendersCount = prevStatsTable.mapRendersCount + 1;
        const nextRenderedTiles = (prevStatsTable.currentlyRenderedTiles = nextData.length);
        const nextTotalTilesRendered = (prevStatsTable.totalTilesRendered += nextData.length);
        const nextUniqueTilesRendered = new Set(prevStatsTable.uniqueTilesRendered);
        const newIds: string[] = nextData.map((tile) => tile.properties?.id as string);
        newIds.forEach((id) => nextUniqueTilesRendered.add(id));
        return {
          ...prevStatsTable,
          currentlyRenderedTiles: nextRenderedTiles,
          mapRendersCount: nextMapRendersCount,
          totalTilesRendered: nextTotalTilesRendered,
          uniqueTilesRendered: nextUniqueTilesRendered,
        };
      });
    }

    return shouldSkipRedering;
  };

  return comparatorFunc;
};

export const filterRangeFuncWrapper = (zoom: number): [number, number] => {
  return [Math.min(zoom + ZOOM_OFFEST, MAX_ZOOM_LEVEL), Math.min(zoom + ZOOM_OFFEST, MAX_ZOOM_LEVEL)];
};

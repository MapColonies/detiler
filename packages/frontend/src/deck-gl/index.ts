import { Feature } from 'geojson';
import { differenceWith } from 'lodash';
import { insertDummyFeature, removeDummyFeature } from '../utils/helpers';
import { Stats } from '../utils/stats';
import { findNumericMinMax, Metric, updateMinMax } from '../utils/metric';
import { normalizeValue } from '../utils/style';
import { MAX_ZOOM_LEVEL } from '../utils/constants';
import { appHelper } from '../utils/helpers';

type ComparatorFunc<T> = (nextData: T, prevData: T) => boolean;

export type TransformFunc<T> = (data: T) => T;

export const transformFuncWrapper = (metric: Metric | undefined): TransformFunc<Feature[]> => {
  const transformFunc = (data: Feature[]): Feature[] => {
    if (metric !== undefined) {
      const metricPropertyArr = data
        .map((feature) => {
          if (feature.properties?.[metric.property] !== undefined) {
            return feature.properties[metric.property] as number;
          }
        })
        .filter((property) => property !== undefined);

      if (metricPropertyArr.length !== 0) {
        const currentMinMax = findNumericMinMax(metricPropertyArr as unknown[] as number[]);
        if (currentMinMax !== null) {
          updateMinMax(currentMinMax, metric);
        }

        data.forEach((feature) => {
          if (feature.properties !== null) {
            const value = feature.properties[metric.property] as number;
            const normalizedValue = normalizeValue(value, metric.range);
            feature.properties['score'] = normalizedValue;
          }
        });
      }
    }

    // to accomplish rendering empty data
    if (data.length === 0) {
      insertDummyFeature(data);
    }

    return data;
  };

  return transformFunc;
};

export const comparatorFuncWrapper = (setStatsTable: (value: React.SetStateAction<Stats>) => void): ComparatorFunc<Feature[]> => {
  const comparatorFunc = (nextData: Feature[], prevData: Feature[]): boolean => {
    let shouldSkipRedering = false;

    // render if override flag is enabled or next data is greater than prev
    if (appHelper.shouldOverrideComarator || prevData.length < nextData.length) {
      appHelper.shouldOverrideComarator = false;
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
  return [Math.min(zoom, MAX_ZOOM_LEVEL), Math.min(zoom, MAX_ZOOM_LEVEL)];
};

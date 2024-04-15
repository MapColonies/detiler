import { Feature } from 'geojson';
import { insertDummyFeature } from '../utils/helpers';
import { Metric } from '../utils/metric';
import { normalizeValue } from '../utils/style';
import { MAX_ZOOM_LEVEL, ZOOM_OFFEST } from '../utils/constants';

type TransformFunc<T> = (data: T) => T;

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

export const filterRangeFuncWrapper = (zoom: number): [number, number] => {
  return [Math.min(zoom + ZOOM_OFFEST, MAX_ZOOM_LEVEL), Math.min(zoom + ZOOM_OFFEST, MAX_ZOOM_LEVEL)];
};

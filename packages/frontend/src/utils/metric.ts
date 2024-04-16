import { TileDetails } from '@map-colonies/detiler-common';
import { MILLISECONDS_IN_SECOND } from './constants';

const DIGITS_AFTER_DECIMAL = 6;

type PresentationType = 'date' | 'string';

export type Detail = keyof TileDetails;
export type CalculatedDetail = 'score';

export interface MinMax {
  min: number;
  max: number;
}

export interface Metric {
  name: string;
  property: Detail;
  range: MinMax;
  minFn?: () => number;
  maxFn?: () => number;
}

export const TIMESTAMP_DETAIL: Detail[] = ['createdAt', 'updatedAt'];

export const INITIAL_MIN_MAX: { min: number; max: number } = { min: Number.MAX_SAFE_INTEGER, max: Number.MIN_SAFE_INTEGER };

export const METRICS: Metric[] = [
  { name: 'update-count', property: 'updateCount', range: INITIAL_MIN_MAX },
  { name: 'updated-at', property: 'updatedAt', range: INITIAL_MIN_MAX },
  { name: 'created-at', property: 'createdAt', range: INITIAL_MIN_MAX },
  { name: 'state', property: 'state', range: INITIAL_MIN_MAX },
  { name: 'currentness', property: 'updatedAt', range: INITIAL_MIN_MAX, maxFn: () => Math.round(Date.now() / MILLISECONDS_IN_SECOND) },
];

export const findMinMax = <T>(arr: T[], property: keyof T): MinMax | null => {
  if (arr.length === 0) {
    return null;
  }

  if (typeof arr[0][property] !== 'number') {
    throw new Error();
  }

  let minValue = arr[0][property] as unknown as number;
  let maxValue = arr[0][property] as unknown as number;

  for (const obj of arr) {
    const value = obj[property] as unknown as number;

    if (value < minValue) {
      minValue = value;
    }

    if (value > maxValue) {
      maxValue = value;
    }
  }

  return { min: minValue, max: maxValue };
};

export const updateMinMax = (current: MinMax, metric: Omit<Metric, 'range'> & { range: MinMax }): void => {
  if (metric.minFn === undefined) {
    if (current.min < metric.range.min) {
      metric.range.min = current.min;
    }
  } else if (typeof metric.minFn === 'number') {
    metric.range.min = metric.minFn;
  } else {
    metric.range.min = metric.minFn();
  }

  if (metric.maxFn === undefined) {
    if (current.max > metric.range.max) {
      metric.range.max = current.max;
    }
  } else if (typeof metric.maxFn === 'number') {
    metric.range.max = metric.maxFn;
  } else {
    metric.range.max = metric.maxFn();
  }
};

export const presentifyValue = (value: number | undefined, type: PresentationType = 'string'): string => {
  if (value === undefined || value === Number.MAX_SAFE_INTEGER || value === Number.MIN_SAFE_INTEGER) {
    return 'N/A';
  }

  if (type === 'date') {
    return `${new Date(value * MILLISECONDS_IN_SECOND).toISOString().split('.')[0]}Z`;
  }

  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return value.toString();
    }
    return value.toFixed(DIGITS_AFTER_DECIMAL).toString();
  }

  return value;
};
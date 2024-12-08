import { createHash } from 'crypto';
import { TileParams, TileParamsWithKit } from '@map-colonies/detiler-common';
import { BoundingBox, LonLat } from '@map-colonies/tile-calc';
import { TileRequestParams } from '../tileDetails/controllers/tileDetailsController';
import { COORDINATES_FRACTION_DIGITS, TILE_DETAILS_KEY_PREFIX } from './constants';
import { TimeoutError } from './errors';

export enum UpsertStatus {
  INSERTED,
  UPDATED,
}

export const promiseTimeout = async <T>(ms: number, promise: Promise<T>): Promise<T> => {
  // create a promise that rejects in <ms> milliseconds
  const timeout = new Promise<T>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new TimeoutError(`Timed out in + ${ms} + ms.`));
    }, ms);
  });

  // returns a race between our timeout and the passed in promise
  return Promise.race([promise, timeout]);
};

export const numerifyTileRequestParams = <T extends TileRequestParams>(requestParams: T): Omit<T, 'z' | 'x' | 'y'> & TileParams => {
  const { z, x, y, ...rest } = requestParams;
  return { z: +z, x: +x, y: +y, ...rest };
};

export const average = (args: number[]): number => {
  const sum = args.reduce((acc, num) => acc + num, 0);
  return sum / args.length;
};

export const bboxToLonLat = (bbox: BoundingBox): LonLat => {
  const lon = average([bbox.west, bbox.east]);
  const lat = average([bbox.north, bbox.south]);
  return { lon, lat };
};

export const bboxToWktPolygon = (bbox: BoundingBox): string => {
  const { west, south, east, north } = bbox;
  return `POLYGON ((${west} ${north}, ${west} ${south}, ${east} ${south}, ${east} ${north}, ${west} ${north}))`;
};

export const stringifyCoordinates = (coordinates: LonLat): string =>
  `${coordinates.lon.toFixed(COORDINATES_FRACTION_DIGITS)}, ${coordinates.lat.toFixed(COORDINATES_FRACTION_DIGITS)}`;

export const keyfy = (params: TileParamsWithKit): string => `${TILE_DETAILS_KEY_PREFIX}:${params.kit}:${params.z}/${params.x}/${params.y}`;

export const hashValue = (value: unknown): string => {
  const hash = createHash('sha256');
  hash.update(JSON.stringify(value));
  return hash.digest('hex');
};

import { TileDetails, TileQueryParams } from '@map-colonies/detiler-common';
import { BoundingBox, LonLat, TILEGRID_WORLD_CRS84, tileToBoundingBox } from '@map-colonies/tile-calc';
import { Feature, Geometry } from 'geojson';
import { FEATURE_ID_DUMMY, MAX_LATITUDE, MAX_LONGITUDE, MIN_LATITUDE, MIN_LONGITUDE, ZOOM_OFFEST } from './constants';
import { AppHelper } from './interfaces';

const querifyLongitude = (longitude: number): number => {
  if (longitude > MAX_LONGITUDE) {
    return MAX_LONGITUDE;
  }
  if (longitude < MIN_LONGITUDE) {
    return MIN_LONGITUDE;
  }
  return longitude;
};

const querifyLatitude = (latitude: number): number => {
  if (latitude > MAX_LATITUDE) {
    return MAX_LATITUDE;
  }
  if (latitude < MIN_LATITUDE) {
    return MIN_LATITUDE;
  }
  return latitude;
};

export const querifyBounds = (bounds: [number, number, number, number]): [number, number, number, number] => {
  const [west, south, east, north] = bounds;
  return [querifyLongitude(west), querifyLatitude(south), querifyLongitude(east), querifyLatitude(north)];
};

export const parseBoolean = (value: string): boolean => value === 'true';

export const compareQueries = (prev: TileQueryParams | undefined, next: TileQueryParams): boolean => {
  if (prev === undefined) {
    return false;
  }

  if (
    prev.kits[0] !== next.kits[0] ||
    prev.minZoom !== next.minZoom ||
    prev.maxZoom !== next.maxZoom ||
    prev.minState !== next.minState ||
    prev.maxState !== next.maxState ||
    prev.bbox[0] !== next.bbox[0] ||
    prev.bbox[1] !== next.bbox[1] ||
    prev.bbox[2] !== next.bbox[2] ||
    prev.bbox[3] !== next.bbox[3]
  ) {
    return false;
  }

  return true;
};

export const bboxToFeature = (boundingBox: BoundingBox): Feature => {
  const { west, south, east, north } = boundingBox;

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south],
        ],
      ],
    },
  };
};

export const parseDataToFeatures = (data: TileDetails[]): Feature[] => {
  return data
    .filter((tileDetails: TileDetails) => tileDetails.z > ZOOM_OFFEST)
    .map((tileDetails: TileDetails) => {
      const boundingBox = tileToBoundingBox(
        { z: tileDetails.z - ZOOM_OFFEST, x: tileDetails.x, y: tileDetails.y, metatile: 1 },
        TILEGRID_WORLD_CRS84,
        true
      );

      const { west, south, east, north } = boundingBox;

      return {
        type: 'Feature',
        properties: { ...tileDetails, id: `${tileDetails.kit}/${tileDetails.z}/${tileDetails.x}/${tileDetails.y}` },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [west, south],
              [east, south],
              [east, north],
              [west, north],
              [west, south],
            ],
          ],
        },
      };
    });
};

export const geometryToFeature = (geometry: Geometry): Feature => {
  return {
    type: 'Feature',
    properties: {},
    geometry,
  };
};

export const insertDummyFeature = (features: Feature[]): Feature[] => {
  if (features.length === 0) {
    features.push({ type: 'Feature', properties: { id: FEATURE_ID_DUMMY }, geometry: { type: 'Point', coordinates: [] } });
  }
  return features;
};

export const removeDummyFeature = (features?: Feature[]): Feature[] | undefined => {
  if (features?.length === 1 && features[0].properties?.id === FEATURE_ID_DUMMY) {
    features.splice(0, 1);
  }
  return features;
};

export const timerify = async <R, A extends unknown[]>(func: (...args: A) => Promise<R>, ...args: A): Promise<[R, number]> => {
  const startTime = performance.now();

  const funcResult = await func(...args);

  const endTime = performance.now();

  return [funcResult, endTime - startTime];
};

export const promiseWithTimeout = async <T>(ms: number, promise: Promise<T>): Promise<void> => {
  // Create a promise that rejects in <ms> milliseconds
  const timeout = new Promise<T>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error(`Timed out in + ${ms} + ms.`));
    }, ms);
  });

  // Returns a race between our timeout and the passed in promise
  await Promise.allSettled([promise, timeout]);
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

export const appHelper: AppHelper = {
  kits: [],
  currentZoomLevel: ZOOM_OFFEST,
  bounds: {},
  lastDetilerQueryParams: undefined,
  shouldOverrideComarator: false,
  shouldFetch: false,
  selectedKit: undefined,
  queryZoom: ZOOM_OFFEST,
};

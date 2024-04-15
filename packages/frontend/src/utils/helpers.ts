import { TileDetails, TileQueryParams } from '@map-colonies/detiler-common';
import { TILEGRID_WORLD_CRS84, tileToBoundingBox } from '@map-colonies/tile-calc';
import { Feature, FeatureCollection } from 'geojson';
import { FEATURE_ID_DUMMY, MAX_LATITUDE, MAX_LONGTITUDE, MIN_LATITUDE, MIN_LONGTITUDE, ZOOM_OFFEST } from './constants';

const querifyLongtitude = (longtitude: number): number => {
  if (longtitude > MAX_LONGTITUDE) {
    return MAX_LONGTITUDE;
  }
  if (longtitude < MIN_LONGTITUDE) {
    return MIN_LONGTITUDE;
  }
  return longtitude;
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
  return [querifyLongtitude(west), querifyLatitude(south), querifyLongtitude(east), querifyLatitude(north)];
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
    prev.bbox[0] !== next.bbox[0] ||
    prev.bbox[1] !== next.bbox[1] ||
    prev.bbox[2] !== next.bbox[2] ||
    prev.bbox[3] !== next.bbox[3]
  ) {
    return false;
  }

  return true;
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

export const insertDummyFeature = (features: Feature[]): Feature[] => {
  if (features.length === 0) {
    features.push({ type: 'Feature', id: FEATURE_ID_DUMMY, properties: {}, geometry: { type: 'Point', coordinates: [] } });
  }
  return features;
};

export const removeDummyFeature = (features?: Feature[]): Feature[] | undefined => {
  if (features?.length === 1 && features[0].id === FEATURE_ID_DUMMY) {
    features.splice(0, 1);
  }
  return features;
};

export const featuresToFeatureCollection = (features: Feature[]): FeatureCollection => {
  return {
    type: 'FeatureCollection',
    features: features,
  };
};

export const timerify = async <R, A extends unknown[]>(func: (...args: A) => Promise<R>, ...args: A): Promise<[R, number]> => {
  const startTime = performance.now();

  const funcResult = await func(...args);

  const endTime = performance.now();

  return [funcResult, endTime - startTime];
};

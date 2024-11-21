import { BoundingBox } from '@map-colonies/tile-calc';

// for some reason redis geospacial search won't respond to larger bbox
export const HALF_GLOBE_BBOX: BoundingBox = { west: -90, south: -85.05112877980659, east: 90, north: 85.05112877980659 };

import { COORDINATE_SYSTEM } from '@deck.gl/core';
import { GeoJsonLayerProps } from '@deck.gl/layers/src/geojson-layer/geojson-layer';
import { DataFilterExtension, DataFilterExtensionProps } from '@deck.gl/extensions';
import { Feature } from '@turf/helpers';
import { RGBA_MAX, RGBA_MIN } from '../utils/style';
import { MAX_ZOOM_LEVEL, MIN_ZOOM_LEVEL } from '../utils/constants';

export const BASEMAP_LAYER_ID = 'main-basemap-layer';
export const TILES_LAYER_ID = 'main-tiles-layer';
export const COOLDOWNS_LAYER_ID = 'cooldowns-layer';
export const OVERVIEW_BASEMAP_LAYER_ID = 'overview-basemap-layer';
export const OVERVIEW_GEOJSON_LAYER_ID = 'overview-geojson-layer';

export const CONSTANT_GEOJSON_LAYER_PROPERTIES: Partial<GeoJsonLayerProps & DataFilterExtensionProps> = {
  coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
  pickable: true,
  stroked: true,
  filled: true,
  extruded: false,
  pointType: 'circle',
  lineWidthUnits: 'pixels',
  getPointRadius: 100,
  getLineWidth: 1,
  getElevation: 50,
  getLineColor: [RGBA_MIN, RGBA_MAX, RGBA_MIN, RGBA_MAX],
  getFilterValue: (tile: Feature): number => tile.properties!.z as number,
  extensions: [new DataFilterExtension({ filterSize: 1 })],
};

export const CONSTANT_COOLDOWNS_LAYER_PROPERTIES: Partial<GeoJsonLayerProps & DataFilterExtensionProps> = {
  coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
  pickable: true,
  stroked: true,
  filled: true,
  extruded: false,
  pointType: 'circle',
  lineWidthUnits: 'pixels',
  getPointRadius: 100,
  getLineWidth: 1,
  getElevation: 50,
  getLineColor: [RGBA_MIN, RGBA_MAX, RGBA_MIN, RGBA_MAX],
};

export const CONSTANT_BASEMAP_LAYER_PROPERTIES = {
  minZoom: MIN_ZOOM_LEVEL,
  maxZoom: MAX_ZOOM_LEVEL,
  coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
};

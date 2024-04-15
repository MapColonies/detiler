import { COORDINATE_SYSTEM } from '@deck.gl/core';
import { GeoJsonLayerProps } from '@deck.gl/layers/src/geojson-layer/geojson-layer';
import { DataFilterExtension, DataFilterExtensionProps } from '@deck.gl/extensions';
import { Feature } from '@turf/helpers';
import { RGBA_MAX, RGBA_MIN } from '../utils/style';
import { MAX_ZOOM_LEVEL, MIN_ZOOM_LEVEL } from '../utils/constants';

const GEOJSON_LAYER_ID = 'detiler-geojson-layer';
const BASEMAP_LAYER_ID = 'detiler-tile-layer';

export const CONSTANT_GEOJSON_LAYER_PROPERTIES: Partial<GeoJsonLayerProps & DataFilterExtensionProps> = {
  id: GEOJSON_LAYER_ID,
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

export const CONSTANT_TILE_LAYER_PROPERTIES = {
  id: BASEMAP_LAYER_ID,
  minZoom: MIN_ZOOM_LEVEL,
  maxZoom: MAX_ZOOM_LEVEL,
  coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
};

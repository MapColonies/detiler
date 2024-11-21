import { GeoJsonLayer } from '@deck.gl/layers';
import { Feature } from 'geojson';
import { BACKGROUND_RGBA } from '../components';
import { COOLDOWN_COLOR_RGB, DEFAULT_COLORED_ALPHA } from '../utils/style';
import { CONSTANT_GEOJSON_LAYER_PROPERTIES, COOLDOWNS_LAYER_ID } from './constants';

export const cooldownLayerFactory = (data: Feature[]): GeoJsonLayer => {
  return new GeoJsonLayer({
    id: COOLDOWNS_LAYER_ID,
    ...CONSTANT_GEOJSON_LAYER_PROPERTIES,
    getFillColor: [COOLDOWN_COLOR_RGB.r, COOLDOWN_COLOR_RGB.g, COOLDOWN_COLOR_RGB.b, DEFAULT_COLORED_ALPHA],
    pickable: false,
    getLineWidth: 2,
    getLineColor: BACKGROUND_RGBA,
    data,
  });
};

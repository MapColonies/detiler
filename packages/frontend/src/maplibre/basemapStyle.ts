import { RasterSourceSpecification, RequestTransformFunction, StyleSpecification } from 'maplibre-gl';
import { config } from '../config';
import { AppConfig } from '../utils/interfaces';
import { MIN_ZOOM_LEVEL, MAX_ZOOM_LEVEL } from '../utils/constants';

const appConfig = config.get<AppConfig>('app');

const BASEMAP_SOURCE_ID = 'basemap-source';
const BASEMAP_LAYER_ID = 'basemap-layer';
const X_API_KEY_HEADER = 'x-api-key';
const TILE_RESOURCE_TYPE = 'Tile';
const DEFAULT_TILE_SIZE = 256;
const NO_SATURATION_CHANGE = 0;

const WORLD_MIN_LON = -180;
const WORLD_MIN_LAT = -90;
const WORLD_MAX_LON = 180;
const WORLD_MAX_LAT = 90;

// the style spec's default source bounds clamp to web mercator's [-85.051129, 85.051129]; CRS84 covers the full poles
const WORLD_BOUNDS: [number, number, number, number] = [WORLD_MIN_LON, WORLD_MIN_LAT, WORLD_MAX_LON, WORLD_MAX_LAT];

const EMPTY_STYLE: StyleSpecification = { version: 8, sources: {}, layers: [] };

const buildBasemapStyle = (): StyleSpecification => {
  const { enabled, url, tileSize, desaturate, minZoom, maxZoom } = appConfig.basemap;

  if (!enabled || url === undefined) {
    return EMPTY_STYLE;
  }

  const source: RasterSourceSpecification = {
    type: 'raster',
    tiles: [url],
    tileSize: tileSize ?? DEFAULT_TILE_SIZE,
    // the source's own real coverage, not the app's UI zoom range - requesting past it 400s instead of overzooming
    minzoom: minZoom ?? MIN_ZOOM_LEVEL,
    maxzoom: maxZoom ?? MAX_ZOOM_LEVEL,
    bounds: WORLD_BOUNDS,
  };

  return {
    version: 8,
    sources: { [BASEMAP_SOURCE_ID]: source },
    layers: [
      {
        id: BASEMAP_LAYER_ID,
        type: 'raster',
        source: BASEMAP_SOURCE_ID,
        paint: {
          // deck.gl's old `desaturate` ran 0 (none) to 1 (full); maplibre's equivalent runs the opposite way, 0 to -1
          /* eslint-disable-next-line @typescript-eslint/naming-convention */
          'raster-saturation': desaturate !== undefined ? -desaturate : NO_SATURATION_CHANGE,
        },
      },
    ],
  };
};

const buildTransformRequest = (xApiKey: string): RequestTransformFunction => {
  return (url, resourceType) => {
    // ResourceType is only type-exported by maplibre-gl (no runtime enum to import), hence the literal comparison
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (resourceType !== TILE_RESOURCE_TYPE) {
      return undefined;
    }
    return { url, headers: { [X_API_KEY_HEADER]: xApiKey } };
  };
};

const { xApiKey } = appConfig.basemap;

export const BASEMAP_STYLE: StyleSpecification = buildBasemapStyle();
export const basemapTransformRequest: RequestTransformFunction | undefined = xApiKey === undefined ? undefined : buildTransformRequest(xApiKey);

import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';
import { config } from '../config';
import { AppConfig } from '../utils/interfaces';
import { CONSTANT_TILE_LAYER_PROPERTIES } from './constants';

const X_API_KEY_HEADER = 'x-api-key';

const appConfig = config.get<AppConfig>('app');

/* eslint-disable @typescript-eslint/naming-convention */
export const basemapLayerFactory = (id: string): TileLayer | undefined => {
  return appConfig.basemap.enabled
    ? new TileLayer({
        ...CONSTANT_TILE_LAYER_PROPERTIES,
        id,
        data: appConfig.basemap.url,
        tileSize: appConfig.basemap.tileSize,
        zoomOffset: appConfig.basemap.zoomOffset,
        loadOptions:
          appConfig.basemap.xApiKey !== undefined
            ? {
                fetch: {
                  method: 'GET',
                  headers: {
                    [X_API_KEY_HEADER]: appConfig.basemap.xApiKey,
                  },
                },
              }
            : {},
        renderSubLayers: (props): BitmapLayer => {
          const {
            boundingBox: [[west, south], [east, north]],
          } = props.tile;

          return new BitmapLayer(props, {
            data: undefined,
            image: props.data as string,
            bounds: [west, south, east, north],
            desaturate: appConfig.basemap.desaturate,
            _imageCoordinateSystem: COORDINATE_SYSTEM.LNGLAT,
          });
          /* eslint-enable @typescript-eslint/naming-convention */
        },
      })
    : undefined;
};

import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';
import { config } from '../config';
import { AppConfig } from '../utils/interfaces';
import { CONSTANT_TILE_LAYER_PROPERTIES } from './constants';

const appConfig = config.get<AppConfig>('app');

/* eslint-disable @typescript-eslint/naming-convention */
export const basemapLayer = appConfig.basemap.enabled
  ? new TileLayer({
      ...CONSTANT_TILE_LAYER_PROPERTIES,
      data: appConfig.basemap.url,
      tileSize: appConfig.basemap.tileSize,
      zoomOffset: appConfig.basemap.zoomOffset,
      loadOptions: appConfig.basemap.xApiKey
        ? {
            fetch: {
              method: 'GET',
              headers: {
                'x-api-key': `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJNYXBDb2xvbmllc0RldiIsImlhdCI6MTUxNjIzOTAyMiwiZCI6WyJyYXN0ZXIiLCJyYXN0ZXJXbXMiLCJyYXN0ZXJFeHBvcnQiLCJkZW0iLCJ2ZWN0b3IiLCIzZCJdfQ.GvTQ_yLjnioxxFrNgGQiuarhJxLpe8AhTTtrWE3LHoUED48CFKBEOfKqOyEWSDVZjx1jHkDvZAL1iyEvi5FHNys7UBRXCiJvVlG-muJZ6ycS9PGKauzL-eggXqTqGsXh4FBkqvHUEElXEnu7ARsMCm5eIC66U2i_eHFU3PLcOc67qJvS1IQjAI2oj9Pd5mGaI_HlDaf3B4PFOb0AHdY-r_MDGwck3asm1G_InVzsvCXt36vImyn1Z4HYaN4YiDfaMLBF0-GGrlLE84PObzGGtt66EIuQ4OneEZSzoQNusBt5-SFs0EQXsfsDc_RMRTz3DZseqkNIKiXEsEBBPjMr7w`,
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

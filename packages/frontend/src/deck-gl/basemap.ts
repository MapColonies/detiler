import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';
import { config } from '../config';
import { AppConfig } from '../utils/interfaces';
import { CONSTANT_TILE_LAYER_PROPERTIES } from './constants';

const appConfig = config.get<AppConfig>('app');

export const basemapLayer = appConfig.basemap.enabled
  ? new TileLayer({
      ...CONSTANT_TILE_LAYER_PROPERTIES,
      data: appConfig.basemap.url,
      tileSize: appConfig.basemap.tileSize,
      zoomOffset: appConfig.basemap.zoomOffset,
      renderSubLayers: (props): BitmapLayer => {
        const {
          boundingBox: [[west, south], [east, north]],
        } = props.tile;

        /* eslint-disable @typescript-eslint/naming-convention */
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

// export const basemapLayer = appConfig.basemap.enabled
// ? new WMSLayer({
//     ...CONSTANT_TILE_LAYER_PROPERTIES,
//     data: appConfig.basemap.url,
//     serviceType: 'wms',
//     layers: ['OSM-WMS'],
//     tileSize: appConfig.basemap.tileSize,
//     zoomOffset: appConfig.basemap.zoomOffset,
//     renderSubLayers: (props): BitmapLayer => {
//       const {
//         boundingBox: [[west, south], [east, north]],
//       } = props.tile;

//       /* eslint-disable @typescript-eslint/naming-convention */
//       return new BitmapLayer(props, {
//         data: undefined,
//         image: props.data as string,
//         bounds: [west, south, east, north],
//         desaturate: appConfig.basemap.desaturate,
//         _imageCoordinateSystem: COORDINATE_SYSTEM.LNGLAT,
//       });
//       /* eslint-enable @typescript-eslint/naming-convention */
//     },
//   })
// : undefined;

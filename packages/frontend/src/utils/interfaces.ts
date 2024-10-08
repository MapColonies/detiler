import { KitMetadata, TileQueryParams } from '@map-colonies/detiler-common';
import { Bounds } from '../deck-gl/types';

export interface AppConfig {
  basemap: {
    enabled: boolean;
    url?: string;
    xApiKey?: string;
    tileSize?: number;
    zoomOffset?: number;
    desaturate?: number;
  };
  style: {
    dataAlphaChannel?: number;
  };
}

export interface AppHelper {
  kits: KitMetadata[];
  currentZoomLevel: number;
  bounds: { actual?: Bounds; query?: Bounds };
  lastDetilerQueryParams?: TileQueryParams;
  shouldOverrideComarator: boolean;
}

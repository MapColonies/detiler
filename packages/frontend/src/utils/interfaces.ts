export interface AppConfig {
  basemap: {
    enabled: boolean;
    url?: string;
    tileSize?: number;
    zoomOffset?: number;
    desaturate?: number;
  };
  style: {
    dataAlphaChannel?: number;
  };
}

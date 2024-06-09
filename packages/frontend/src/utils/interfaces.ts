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

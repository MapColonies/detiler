/// <reference types="vite/client" />

interface DetilerClientConfig {
  readonly CONFIG_DETILER_CLIENT_URL: string;
  readonly CONFIG_DETILER_CLIENT_TIMEOUT?: string;
  readonly CONFIG_DETILER_CLIENT_ENABLE_RETRY_STRATEGY: string;
  readonly CONFIG_DETILER_CLIENT_RETRY_STRATEGY_RETRIES?: string;
  readonly CONFIG_DETILER_CLIENT_RETRY_STRATEGY_SHOULD_RESET_TIMEOUT?: string;
  readonly CONFIG_DETILER_CLIENT_RETRY_STRATEGY_IS_EXPONENTIAL?: string;
  readonly CONFIG_DETILER_CLIENT_RETRY_STRATEGY_DELAY?: string;
}

interface AppConfig {
  readonly CONFIG_APP_BASEMAP_ENABLED: string;
  readonly CONFIG_APP_BASEMAP_URL?: string;
  readonly CONFIG_APP_BASEMAP_XAPIKEY?: string;
  readonly CONFIG_APP_BASEMAP_TILE_SIZE?: string;
  readonly CONFIG_APP_BASEMAP_ZOOM_OFFSET?: string;
  readonly CONFIG_APP_BASEMAP_DESATURATE?: string;
  readonly CONFIG_APP_DATA_ALPHA_CHANNEL?: string;
  readonly CONFIG_APP_KITS_FETCH_INTERVAL?: string;
  readonly CONFIG_APP_TILES_FETCH_INTERVAL?: string;
  readonly CONFIG_APP_TILES_BATCH_SIZE?: string;
  readonly CONFIG_APP_TILES_FETCH_TIMEOUT?: string;
}

interface ImportMetaEnv extends AppConfig, DetilerClientConfig {
  readonly CONFIG_LOG_LEVEL: string;
  readonly CONFIG_LOG_PRETTY_PRINT_ENABLED: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

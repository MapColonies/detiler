import { DetilerClientConfig } from '@map-colonies/detiler-client';
import { parseBoolean } from '../utils/helpers';
import { AppConfig } from '../utils/interfaces';
import { ConfigStore, IConfig } from './configStore';

const viteConfig = import.meta.env;

export const config: IConfig = (function (): IConfig {
  const config = new ConfigStore();

  config.set('telemetry.logger', {
    level: viteConfig.CONFIG_LOG_LEVEL,
    prettyPrint: parseBoolean(viteConfig.CONFIG_LOG_PRETTY_PRINT_ENABLED),
  });

  const retryStrategy = parseBoolean(viteConfig.CONFIG_DETILER_CLIENT_ENABLE_RETRY_STRATEGY)
    ? {
        delay: parseInt(viteConfig.CONFIG_DETILER_CLIENT_RETRY_STRATEGY_DELAY!),
        isExponential: parseBoolean(viteConfig.CONFIG_DETILER_CLIENT_RETRY_STRATEGY_IS_EXPONENTIAL!),
        retries: parseInt(viteConfig.CONFIG_DETILER_CLIENT_RETRY_STRATEGY_RETRIES!),
        shouldResetTimeout: parseBoolean(viteConfig.CONFIG_DETILER_CLIENT_RETRY_STRATEGY_SHOULD_RESET_TIMEOUT!),
      }
    : undefined;

  const detilerConfig: DetilerClientConfig = {
    url: viteConfig.CONFIG_DETILER_CLIENT_URL,
    timeout: viteConfig.CONFIG_DETILER_CLIENT_TIMEOUT !== undefined ? parseInt(viteConfig.CONFIG_DETILER_CLIENT_TIMEOUT) : undefined,
    enableRetryStrategy: parseBoolean(viteConfig.CONFIG_DETILER_CLIENT_ENABLE_RETRY_STRATEGY),
    retryStrategy,
  };

  const basemap = parseBoolean(viteConfig.CONFIG_APP_BASEMAP_ENABLED)
    ? {
        url: viteConfig.CONFIG_APP_BASEMAP_URL,
        xApiKey: viteConfig.CONFIG_APP_BASEMAP_XAPIKEY,
        tileSize: parseInt(viteConfig.CONFIG_APP_BASEMAP_TILE_SIZE!),
        zoomOffset: parseInt(viteConfig.CONFIG_APP_BASEMAP_ZOOM_OFFSET!),
        desaturate: parseInt(viteConfig.CONFIG_APP_BASEMAP_DESATURATE!),
      }
    : {};

  const appConfig: AppConfig = {
    basemap: {
      enabled: parseBoolean(viteConfig.CONFIG_APP_BASEMAP_ENABLED),
      ...basemap,
    },
    style: {
      dataAlphaChannel: viteConfig.CONFIG_APP_DATA_ALPHA_CHANNEL !== undefined ? parseInt(viteConfig.CONFIG_APP_DATA_ALPHA_CHANNEL) : undefined,
      tilesPerPage: viteConfig.CONFIG_APP_UI_TILES_PER_PAGE !== undefined ? parseInt(viteConfig.CONFIG_APP_UI_TILES_PER_PAGE) : undefined,
    },
    kits: {
      fetchInterval: viteConfig.CONFIG_APP_KITS_FETCH_INTERVAL !== undefined ? parseInt(viteConfig.CONFIG_APP_KITS_FETCH_INTERVAL) : undefined,
    },
    tiles: {
      batchSize: viteConfig.CONFIG_APP_TILES_BATCH_SIZE !== undefined ? parseInt(viteConfig.CONFIG_APP_TILES_BATCH_SIZE) : undefined,
      fetchInterval: viteConfig.CONFIG_APP_TILES_FETCH_INTERVAL !== undefined ? parseInt(viteConfig.CONFIG_APP_TILES_FETCH_INTERVAL) : undefined,
      fetchTimeout: viteConfig.CONFIG_APP_TILES_FETCH_TIMEOUT !== undefined ? parseInt(viteConfig.CONFIG_APP_TILES_FETCH_TIMEOUT) : undefined,
    },
  };

  config.set('client', detilerConfig);
  config.set('app', appConfig);

  return config;
})();

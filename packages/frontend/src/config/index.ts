import { DetilerClientConfig } from '@map-colonies/detiler-client';
import { parseBoolean } from '../utils/helpers';
import { AppConfig } from '../utils/interfaces';
import { ConfigStore, IConfig } from './configStore';

const viteConfig = import.meta.env;

const PLACEHOLDER_SUFFIX = '_PLACEHOLDER';

type ParseType = 'string' | 'number' | 'boolean';

const isPlaceholder = (value: string | undefined): boolean => {
  return typeof value === 'string' && value.endsWith(PLACEHOLDER_SUFFIX);
};

const parseValue = <T extends ParseType, R = T extends 'string' ? string : T extends 'number' ? number : T extends 'boolean' ? boolean : undefined>(
  type: T,
  value?: string
): R | undefined => {
  if (value === undefined || isPlaceholder(value)) {
    return undefined;
  }

  switch (type) {
    case 'string': {
      return value as R;
    }
    case 'number': {
      return parseInt(value) as R;
    }
    case 'boolean': {
      return parseBoolean(value) as R;
    }
    default: {
      return undefined;
    }
  }
};

export const config: IConfig = (function (): IConfig {
  const config = new ConfigStore();

  config.set('telemetry.logger', {
    level: parseValue('string', viteConfig.CONFIG_LOG_LEVEL),
    prettyPrint: parseValue('boolean', viteConfig.CONFIG_LOG_PRETTY_PRINT_ENABLED),
  });

  const retryStrategy =
    parseValue('boolean', viteConfig.CONFIG_DETILER_CLIENT_ENABLE_RETRY_STRATEGY) ?? false
      ? {
          delay: parseValue('number', viteConfig.CONFIG_DETILER_CLIENT_RETRY_STRATEGY_DELAY),
          isExponential: parseValue('boolean', viteConfig.CONFIG_DETILER_CLIENT_RETRY_STRATEGY_IS_EXPONENTIAL),
          retries: parseValue('number', viteConfig.CONFIG_DETILER_CLIENT_RETRY_STRATEGY_RETRIES),
          shouldResetTimeout: parseValue('boolean', viteConfig.CONFIG_DETILER_CLIENT_RETRY_STRATEGY_SHOULD_RESET_TIMEOUT),
        }
      : undefined;

  const detilerConfig: DetilerClientConfig = {
    url: viteConfig.CONFIG_DETILER_CLIENT_URL,
    timeout: parseValue('number', viteConfig.CONFIG_DETILER_CLIENT_TIMEOUT),
    enableRetryStrategy: parseValue('boolean', viteConfig.CONFIG_DETILER_CLIENT_ENABLE_RETRY_STRATEGY),
    retryStrategy,
  };

  const basemap = parseBoolean(viteConfig.CONFIG_APP_BASEMAP_ENABLED)
    ? {
        url: parseValue('string', viteConfig.CONFIG_APP_BASEMAP_URL),
        xApiKey: parseValue('string', viteConfig.CONFIG_APP_BASEMAP_XAPIKEY),
        tileSize: parseValue('number', viteConfig.CONFIG_APP_BASEMAP_TILE_SIZE),
        zoomOffset: parseValue('number', viteConfig.CONFIG_APP_BASEMAP_ZOOM_OFFSET),
        desaturate: parseValue('number', viteConfig.CONFIG_APP_BASEMAP_DESATURATE),
      }
    : {};

  const appConfig: AppConfig = {
    basemap: {
      enabled: parseValue('boolean', viteConfig.CONFIG_APP_BASEMAP_ENABLED) ?? false,
      ...basemap,
    },
    style: {
      dataAlphaChannel: parseValue('number', viteConfig.CONFIG_APP_DATA_ALPHA_CHANNEL),
      tilesPerPage: parseValue('number', viteConfig.CONFIG_APP_UI_TILES_PER_PAGE),
    },
    kits: {
      fetchInterval: parseValue('number', viteConfig.CONFIG_APP_KITS_FETCH_INTERVAL),
    },
    tiles: {
      batchSize: parseValue('number', viteConfig.CONFIG_APP_TILES_BATCH_SIZE),
      fetchInterval: parseValue('number', viteConfig.CONFIG_APP_TILES_FETCH_INTERVAL),
      fetchTimeout: parseValue('number', viteConfig.CONFIG_APP_TILES_FETCH_TIMEOUT),
    },
  };

  config.set('client', detilerConfig);
  config.set('app', appConfig);

  return config;
})();

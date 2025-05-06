import { readFileSync } from 'fs';
import { ILogger } from '@map-colonies/detiler-common';
import { HealthCheck } from '@godaddy/terminus';
import { createClient, RedisClientOptions } from 'redis';
import { DependencyContainer, FactoryFunction } from 'tsyringe';
import { SERVICES } from '../common/constants';
import { RedisConfig } from '../common/interfaces';
import { ConfigType } from '../common/config';
import { promiseTimeout } from '../common/util';

const DEFAULT_LIMIT_FROM = 0;

const createConnectionOptions = (redisConfig: RedisConfig): Partial<RedisClientOptions> => {
  const { host, port, tls, ...clientOptions } = redisConfig;
  clientOptions.socket = { host, port };
  if (tls.enabled) {
    clientOptions.socket = {
      ...clientOptions.socket,
      tls: true,
      key: tls.key !== '' ? readFileSync(tls.key) : undefined,
      cert: tls.cert !== '' ? readFileSync(tls.cert) : undefined,
      ca: tls.ca !== '' ? readFileSync(tls.ca) : undefined,
    };
  }

  return clientOptions;
};

export const CONNECTION_TIMEOUT = 5000;

export const DEFAULT_PAGE_SIZE = 1000;

export const DEFAULT_LIMIT = { from: DEFAULT_LIMIT_FROM, size: DEFAULT_PAGE_SIZE };

export type RedisClient = ReturnType<typeof createClient>;

export interface AggregateReply {
  total: number;
  results: Record<string, string>[];
  cursor?: number;
}

export const redisClientFactory: FactoryFunction<RedisClient> = (container: DependencyContainer): RedisClient => {
  const logger = container.resolve<ILogger>(SERVICES.LOGGER);
  const config = container.resolve<ConfigType>(SERVICES.CONFIG);
  const dbConfig = config.get('redis');
  const connectionOptions = createConnectionOptions(dbConfig);

  const redisClient = createClient(connectionOptions)
    .on('error', (error: Error) => logger.error({ msg: 'redis client errored', err: error }))
    .on('reconnecting', (...args) => logger.warn({ msg: 'redis client reconnecting', ...args }))
    .on('end', (...args) => logger.info({ msg: 'redis client end', ...args }))
    .on('connect', (...args) => logger.debug({ msg: 'redis client connected', ...args }))
    .on('ready', (...args) => logger.debug({ msg: 'redis client is ready', ...args }));

  return redisClient;
};

export const healthCheckFunctionFactory = (redis: RedisClient): HealthCheck => {
  return async (): Promise<void> => {
    const check = redis.ping().then(() => {
      return;
    });
    return promiseTimeout<void>(CONNECTION_TIMEOUT, check);
  };
};

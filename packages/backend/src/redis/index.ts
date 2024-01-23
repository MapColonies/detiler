import { readFileSync } from 'fs';
import { ILogger } from '@map-colonies/detiler-common';
import { HealthCheck } from '@godaddy/terminus';
import { createClient, RedisClientOptions } from 'redis';
import { DependencyContainer, FactoryFunction } from 'tsyringe';
import { SERVICES } from '../common/constants';
import { RedisConfig, IConfig } from '../common/interfaces';
import { promiseTimeout } from '../common/util';

const createConnectionOptions = (redisConfig: RedisConfig): Partial<RedisClientOptions> => {
  const { host, port, enableSslAuth, sslPaths, ...clientOptions } = redisConfig;
  clientOptions.socket = { host, port };
  if (enableSslAuth) {
    clientOptions.password = undefined;
    clientOptions.socket = {
      ...clientOptions.socket,
      tls: true,
      key: readFileSync(sslPaths.key),
      cert: readFileSync(sslPaths.cert),
      ca: readFileSync(sslPaths.ca),
    };
  }

  return clientOptions;
};

export const CONNECTION_TIMEOUT = 5000;

export type RedisClient = ReturnType<typeof createClient>;

export const redisClientFactory: FactoryFunction<RedisClient> = (container: DependencyContainer): RedisClient => {
  const logger = container.resolve<ILogger>(SERVICES.LOGGER);
  const config = container.resolve<IConfig>(SERVICES.CONFIG);
  const dbConfig = config.get<RedisConfig>('redis');
  const connectionOptions = createConnectionOptions(dbConfig);

  const redisClient = createClient(connectionOptions)
    .on('error', (...args) => logger.error({ msg: 'redis client errored', ...args }))
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

import config from 'config';
import { getOtelMixin } from '@map-colonies/tracing-utils';
import { trace } from '@opentelemetry/api';
import type { DependencyContainer } from 'tsyringe/dist/typings/types';
import type { LoggerOptions } from '@map-colonies/js-logger';
import { jsLogger } from '@map-colonies/js-logger';
import { CleanupRegistry } from '@map-colonies/cleanup-registry';
import type { HealthCheck } from '@godaddy/terminus';
import { instancePerContainerCachingFactory } from 'tsyringe';
import { Registry } from 'prom-client';
import { HEALTHCHECK, ON_SIGNAL, SERVICES, SERVICE_NAME } from './common/constants';
import { getTracing } from './common/tracing';
import type { RedisConfig } from './common/interfaces';
import { tileDetailsRouterFactory, TILE_DETAILS_ROUTER_SYMBOL } from './tileDetails/routes/tileDetailsRouter';
import type { InjectionObject } from './common/dependencyRegistration';
import { registerDependencies } from './common/dependencyRegistration';
import type { RedisClient } from './redis';
import { healthCheckFunctionFactory, redisClientFactory } from './redis';
import { ensureSearchIndices } from './redis/indices';
import { kitRouterFactory, KIT_ROUTER_SYMBOL } from './kit/routes/kitRouter';
import { COOLDOWN_ROUTER_SYMBOL, cooldownRouterFactory } from './cooldown/routes/cooldownRouter';

export interface RegisterOptions {
  override?: InjectionObject<unknown>[];
  useChild?: boolean;
}

export const registerExternalValues = async (options?: RegisterOptions): Promise<DependencyContainer> => {
  const cleanupRegistry = new CleanupRegistry();

  try {
    const loggerConfig = config.get<LoggerOptions>('telemetry.logger');
    const logger = await jsLogger({ ...loggerConfig, prettyPrint: loggerConfig.prettyPrint, mixin: getOtelMixin() });
    const cleanupRegistryLogger = logger.child({ subComponent: 'cleanupRegistry' });

    cleanupRegistry.on('itemFailed', (id, error, msg) => cleanupRegistryLogger.error({ msg, itemId: id, err: error }));
    cleanupRegistry.on('finished', (status) => cleanupRegistryLogger.info({ msg: `cleanup registry finished cleanup`, status }));

    cleanupRegistry.register({ func: getTracing().stop.bind(getTracing()), id: SERVICES.TRACER });
    const tracer = trace.getTracer(SERVICE_NAME);

    const metricsRegistry = new Registry();
    const redisKeyPrefix = config.get<RedisConfig>('redis').keyPrefix;

    const dependencies: InjectionObject<unknown>[] = [
      { token: SERVICES.CONFIG, provider: { useValue: config } },
      { token: SERVICES.LOGGER, provider: { useValue: logger } },
      { token: SERVICES.TRACER, provider: { useValue: tracer } },
      { token: SERVICES.METRICS, provider: { useValue: metricsRegistry } },
      { token: SERVICES.REDIS_KEY_PREFIX, provider: { useValue: redisKeyPrefix } },
      { token: TILE_DETAILS_ROUTER_SYMBOL, provider: { useFactory: tileDetailsRouterFactory } },
      { token: KIT_ROUTER_SYMBOL, provider: { useFactory: kitRouterFactory } },
      { token: COOLDOWN_ROUTER_SYMBOL, provider: { useFactory: cooldownRouterFactory } },
      {
        token: SERVICES.REDIS,
        provider: { useFactory: instancePerContainerCachingFactory(redisClientFactory) },
        postInjectionHook: async (deps: DependencyContainer): Promise<void> => {
          const redis = deps.resolve<RedisClient>(SERVICES.REDIS);
          cleanupRegistry.register({ func: redis.disconnect.bind(redis), id: SERVICES.REDIS });
          await redis.connect();
          await ensureSearchIndices(redis, logger, redisKeyPrefix);
        },
      },
      {
        token: HEALTHCHECK,
        provider: {
          useFactory: (container): HealthCheck => {
            const redis = container.resolve<RedisClient>(SERVICES.REDIS);
            return healthCheckFunctionFactory(redis);
          },
        },
      },
      {
        token: ON_SIGNAL,
        provider: {
          useValue: cleanupRegistry.trigger.bind(cleanupRegistry),
        },
      },
    ];

    const container = await registerDependencies(dependencies, options?.override, options?.useChild);
    return container;
  } catch (error) {
    await cleanupRegistry.trigger();
    throw error;
  }
};

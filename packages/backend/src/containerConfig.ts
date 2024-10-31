import config from 'config';
import { getOtelMixin } from '@map-colonies/telemetry';
import { trace, metrics as OtelMetrics } from '@opentelemetry/api';
import { DependencyContainer } from 'tsyringe/dist/typings/types';
import jsLogger, { LoggerOptions } from '@map-colonies/js-logger';
import { CleanupRegistry } from '@map-colonies/cleanup-registry';
import { HealthCheck } from '@godaddy/terminus';
import { instancePerContainerCachingFactory } from 'tsyringe';
import { Metrics } from '@map-colonies/telemetry';
import { HEALTHCHECK, ON_SIGNAL, SERVICES, SERVICE_NAME } from './common/constants';
import { tracing } from './common/tracing';
import { tileDetailsRouterFactory, TILE_DETAILS_ROUTER_SYMBOL } from './tileDetails/routes/tileDetailsRouter';
import { InjectionObject, registerDependencies } from './common/dependencyRegistration';
import { healthCheckFunctionFactory, RedisClient, redisClientFactory } from './redis';
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
    const logger = jsLogger({ ...loggerConfig, prettyPrint: loggerConfig.prettyPrint, mixin: getOtelMixin() });
    const cleanupRegistryLogger = logger.child({ subComponent: 'cleanupRegistry' });

    cleanupRegistry.on('itemFailed', (id, error, msg) => cleanupRegistryLogger.error({ msg, itemId: id, err: error }));
    cleanupRegistry.on('finished', (status) => cleanupRegistryLogger.info({ msg: `cleanup registry finished cleanup`, status }));

    const metrics = new Metrics();
    cleanupRegistry.register({ func: metrics.stop.bind(metrics), id: SERVICES.METER });
    metrics.start();

    cleanupRegistry.register({ func: tracing.stop.bind(tracing), id: SERVICES.TRACER });
    tracing.start();
    const tracer = trace.getTracer(SERVICE_NAME);

    const dependencies: InjectionObject<unknown>[] = [
      { token: SERVICES.CONFIG, provider: { useValue: config } },
      { token: SERVICES.LOGGER, provider: { useValue: logger } },
      { token: SERVICES.TRACER, provider: { useValue: tracer } },
      { token: SERVICES.METER, provider: { useValue: OtelMetrics.getMeterProvider().getMeter(SERVICE_NAME) } },
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

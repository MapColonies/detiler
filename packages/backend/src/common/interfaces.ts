import { RedisClientOptions } from 'redis';
import { type vectorDetilerV1Type } from '@map-colonies/schemas';

interface LogFn {
  (obj: unknown, msg?: string, ...args: unknown[]): void;
  (msg: string, ...args: unknown[]): void;
}

export type BaseRedisConfig = Pick<vectorDetilerV1Type, 'redis'>['redis'];

export type RedisConfig = BaseRedisConfig & RedisClientOptions;

export interface ILogger {
  trace?: LogFn;
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  fatal?: LogFn;
}

import { RedisClientOptions } from 'redis';

interface LogFn {
  (obj: unknown, msg?: string, ...args: unknown[]): void;
  (msg: string, ...args: unknown[]): void;
}

export type RedisConfig = {
  host: string;
  port: number;
  enableSslAuth: boolean;
  sslPaths: { ca: string; cert: string; key: string };
} & RedisClientOptions;

export interface ILogger {
  trace?: LogFn;
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  fatal?: LogFn;
}

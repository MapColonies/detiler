import { ILogger } from '@map-colonies/detiler-common';

export const DEFAULT_RETRY_STRATEGY_DELAY = 0;

export interface RetryStrategy {
  retries?: number;
  shouldResetTimeout?: boolean;
  isExponential?: boolean;
  delay?: number;
}

export interface DetilerClientConfig {
  url: string;
  timeout?: number;
  enableRetryStrategy?: boolean;
  retryStrategy?: RetryStrategy;
}

export interface DetilerOptions extends DetilerClientConfig {
  logger?: ILogger;
}
import { ILogger } from '@map-colonies/detiler-common';

export const DEFAULT_RETRY_STRATEGY_DELAY = 0;
export const DEFAULT_PAGE_SIZE = 100;

export interface RetryStrategy {
  retries?: number;
  shouldResetTimeout?: boolean;
  isExponential?: boolean;
  delay?: number;
}

export interface DetilerClientConfig {
  url: string;
  timeout?: number;
  headers?: Record<string, string>;
  enableRetryStrategy?: boolean;
  retryStrategy?: RetryStrategy;
}

export interface DetilerOptions extends DetilerClientConfig {
  logger?: ILogger;
}

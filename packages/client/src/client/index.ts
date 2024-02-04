import axios, { AxiosError, AxiosInstance } from 'axios';
import axiosRetry, { exponentialDelay, IAxiosRetryConfig } from 'axios-retry';
import { StatusCodes } from 'http-status-codes';
import { ILogger, TileDetails, TileDetailsPayload, TileParamsWithKit } from '@map-colonies/detiler-common';
import { DEFAULT_RETRY_STRATEGY_DELAY, DetilerClientConfig, DetilerOptions, RetryStrategy } from './config';

export interface IDetilerClient {
  getTileDetails: (params: TileParamsWithKit) => Promise<TileDetails | null>;
  setTileDetails: (params: TileParamsWithKit, payload: TileDetailsPayload) => Promise<void>;
}

export class DetilerClient implements IDetilerClient {
  private readonly logger: ILogger | undefined;
  private readonly config: DetilerClientConfig;
  private readonly axios: AxiosInstance;

  public constructor(options: DetilerOptions) {
    const { logger, ...config } = options;
    this.logger = logger;
    this.config = config;
    this.axios = axios.create({ timeout: options.timeout });
    if (options.enableRetryStrategy === true) {
      this.configureRetryStrategy(options.retryStrategy as RetryStrategy);
    }
  }

  public async getTileDetails(params: TileParamsWithKit): Promise<TileDetails | null> {
    this.logger?.debug({ msg: `getting tile details`, url: this.config.url, ...params });

    try {
      const res = await this.axios.get<TileDetails>(`${this.config.url}/detail/${params.kit}/${params.z}/${params.x}/${params.y}`);
      return res.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      this.logger?.error({
        msg: `failed to get tile details`,
        err: axiosError,
        url: this.config.url,
        ...params,
      });

      if (axiosError.response?.status === StatusCodes.NOT_FOUND) {
        return null;
      }

      throw axiosError;
    }
  }

  public async setTileDetails(params: TileParamsWithKit, payload: TileDetailsPayload): Promise<void> {
    this.logger?.debug({ msg: `setting tile details`, url: this.config.url, ...params, payload });

    try {
      const res = await this.axios.put<void>(`${this.config.url}/detail/${params.kit}/${params.z}/${params.x}/${params.y}`, payload);
      return res.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      this.logger?.error({
        msg: `failed to set tile details`,
        err: axiosError,
        url: this.config.url,
        ...params,
      });

      throw axiosError;
    }
  }

  private configureRetryStrategy(retryStrategy: RetryStrategy): void {
    const config: IAxiosRetryConfig = {
      retries: retryStrategy.retries,
      shouldResetTimeout: retryStrategy.shouldResetTimeout,
      retryDelay: retryStrategy.isExponential === true ? exponentialDelay : (): number => retryStrategy.delay ?? DEFAULT_RETRY_STRATEGY_DELAY,
      onRetry: (retryCount, error, requestConfig) => {
        this.logger?.warn({ msg: `retrying request`, retryStrategy, retryCount, err: error, requestConfig });
      },
    };

    axiosRetry(this.axios, config);
  }
}

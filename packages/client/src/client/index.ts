import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import axiosRetry, { exponentialDelay, IAxiosRetryConfig } from 'axios-retry';
import { StatusCodes } from 'http-status-codes';
import { stringify } from 'qs';
import {
  ILogger,
  KitMetadata,
  TileDetails,
  TileDetailsPayload,
  TileParams,
  TileParamsWithKit,
  TileQueryParams,
  TileQueryResponse,
} from '@map-colonies/detiler-common';
import { DEFAULT_PAGE_SIZE, DEFAULT_RETRY_STRATEGY_DELAY, DetilerClientConfig, DetilerOptions, RetryStrategy } from './config';

export interface IDetilerClient {
  getKits: () => Promise<KitMetadata[]>;
  queryTilesDetails: (params: TileQueryParams) => Promise<TileDetails[]>;
  queryTilesDetailsAsyncGenerator: (params: TileQueryParams) => AsyncGenerator<TileDetails[]>;
  getTileDetails: (params: TileParamsWithKit) => Promise<TileDetails | null>;
  getTilesDetails: (params: TileParams & { kits?: string[] }) => Promise<TileDetails[]>;
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
    this.axios = axios.create({ timeout: options.timeout, headers: options.headers });
    if (options.enableRetryStrategy === true) {
      this.configureRetryStrategy(options.retryStrategy as RetryStrategy);
    }
  }

  public async getKits(): Promise<KitMetadata[]> {
    this.logger?.debug({ msg: `getting kits`, url: this.config.url });

    try {
      const res = await this.axios.get<KitMetadata[]>(`${this.config.url}/kits`);
      return res.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      this.logger?.error({
        msg: `failed to get kits`,
        err: axiosError,
        url: this.config.url,
      });

      throw axiosError;
    }
  }

  public async queryTilesDetails(params: TileQueryParams): Promise<TileDetails[]> {
    this.logger?.debug({ msg: `getting tile details`, url: this.config.url, ...params });

    try {
      const res = await this.axios.get<TileDetails[]>(`${this.config.url}/detail`, {
        params,
        paramsSerializer: (params) => stringify(params),
      });
      return res.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      this.logger?.error({
        msg: `failed to get tiles details`,
        err: axiosError,
        url: this.config.url,
        params,
      });

      throw axiosError;
    }
  }

  public async *queryTilesDetailsAsyncGenerator(params: TileQueryParams, controller?: AbortController): AsyncGenerator<TileDetails[]> {
    let cursor: number | undefined = undefined;

    const pageSize = params.size ?? DEFAULT_PAGE_SIZE;

    this.logger?.debug({ msg: `getting tile details`, url: this.config.url, cursor, size: pageSize, ...params });

    /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */ // get the next page unconditionally until done
    while (true) {
      const pageParams: TileQueryParams = { ...params, cursor, size: pageSize };
      try {
        const res: AxiosResponse<TileQueryResponse> = await this.axios.get(`${this.config.url}/detail`, {
          params: { ...pageParams, cursor },
          paramsSerializer: (params) => stringify(params),
          signal: controller?.signal,
        });

        // check if the cursor has reached is limit
        if (res.data.cursor === undefined || res.data.cursor === 0) {
          if (res.data.tiles.length !== 0) {
            yield res.data.tiles;
          }
          break;
        }

        yield res.data.tiles;
        cursor = res.data.cursor;
      } catch (error) {
        const axiosError = error as AxiosError;

        this.logger?.error({
          msg: `failed to get tiles details for cursor ${cursor}`,
          err: axiosError,
          url: this.config.url,
          params: pageParams,
        });

        throw axiosError;
      }
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

  public async getTilesDetails(params: TileParams & { kits?: string[] }): Promise<TileDetails[]> {
    this.logger?.debug({ msg: `getting tile details`, url: this.config.url, ...params });

    try {
      const res = await this.axios.get<TileDetails[]>(`${this.config.url}/detail/${params.z}/${params.x}/${params.y}`, {
        paramsSerializer: (params) => stringify(params.kits),
      });
      return res.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      this.logger?.error({
        msg: `failed to get tiles details`,
        err: axiosError,
        url: this.config.url,
        ...params,
      });

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

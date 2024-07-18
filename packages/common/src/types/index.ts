interface LogFn {
  (obj: unknown, msg?: string, ...args: unknown[]): void;
  (msg: string, ...args: unknown[]): void;
}

export interface ILogger {
  trace?: LogFn;
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  fatal?: LogFn;
}

export interface TileParams {
  z: number;
  x: number;
  y: number;
}

export interface TileParamsWithKit extends TileParams {
  kit: string;
}

export interface TileDetails extends TileParamsWithKit {
  state: number;
  createdAt: number;
  updatedAt: number;
  updateCount: number;
  skipCount: number;
  coordinates: string;
  geoshape: string;
}

export interface TileDetailsPayload {
  timestamp: number;
  state?: number;
  hasSkipped?: boolean;
}

export interface BaseQueryParams {
  from?: number;
  size?: number;
}

export interface TileQueryParams extends BaseQueryParams {
  minZoom: number;
  maxZoom: number;
  minState?: number;
  maxState?: number;
  kits: string[];
  bbox: number[];
}

export interface KitMetadata {
  name: string;
  [property: string]: string;
}

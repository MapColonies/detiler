import { Geometry } from 'geojson';

interface LogFn {
  (obj: unknown, msg?: string, ...args: unknown[]): void;
  (msg: string, ...args: unknown[]): void;
}

type BBox = [number, number, number, number];

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
  states: number[];
  createdAt: number;
  updatedAt: number;
  renderedAt: number;
  updateCount: number;
  renderCount: number;
  skipCount: number;
  coolCount: number;
  coordinates: string;
  geoshape: string;
}

export interface TileQueryResponse {
  tiles: TileDetails[];
  cursor?: number;
}

export type TileProcessStatus = 'rendered' | 'skipped' | 'cooled';

export interface TileDetailsPayload {
  timestamp: number;
  state?: number;
  status?: TileProcessStatus;
}

export interface BaseQueryParams {
  cursor?: number;
  size?: number;
}

export interface TileQueryParams extends BaseQueryParams {
  minZoom: number;
  maxZoom: number;
  minState?: number;
  maxState?: number;
  shouldMatchCurrentState?: boolean;
  kits: string[];
  bbox: number[];
}

export interface KitMetadata {
  [property: string]: string;
  name: string;
}

export interface Cooldown {
  duration: number;
  kits: string[];
  minZoom: number;
  maxZoom: number;
  enabled: boolean;
  ttl?: number;
  description?: string;
  geoshape?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CooldownQueryParams {
  enabled?: boolean;
  kits?: string[];
  minZoom?: number;
  maxZoom?: number;
  area?: BBox;
  from?: number;
  size?: number;
}

export interface CooldownCreationRequest<A = BBox | Geometry> extends Omit<Cooldown, 'geoshape' | 'createdAt' | 'updatedAt'> {
  area?: A;
}

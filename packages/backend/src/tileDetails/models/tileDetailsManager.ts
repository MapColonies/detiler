import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import {
  TileDetails,
  TileDetailsPayload,
  TileParams,
  TileParamsWithKit,
  TileQueryParams,
  TileQueryResponse,
  UNSPECIFIED_STATE,
} from '@map-colonies/detiler-common';
import { WatchError } from 'redis';
import { BoundingBox, TILEGRID_WORLD_CRS84, tileToBoundingBox } from '@map-colonies/tile-calc';
import { AggregateReply, DEFAULT_LIMIT, DEFAULT_PAGE_SIZE, RedisClient } from '../../redis';
import { keyfy, kitHashKey, tileIndexName, stringifyCoordinates, bboxToWktPolygon, UpsertStatus, bboxToLonLat } from '../../common/util';
import { METATILE_SIZE, SERVICES, SEARCHED_GEOSHAPE_NAME, REDIS_SEARCH_DIALECT } from '../../common/constants';
import type { IConfig, RedisConfig } from '../../common/interfaces';
import { KitManager } from '../../kit/models/kitManager';
import { KitNotFoundError, TileDetailsNotFoundError } from './errors';
import { LOAD_FIELDS, NEWLY_INSERTED_TILE_COUNTERS, transformDocument } from './util';

export interface TilesDetailsQueryParams extends Omit<TileQueryParams, 'bbox'> {
  bbox: BoundingBox;
}

@injectable()
export class TileDetailsManager {
  private readonly keyPrefix: string;
  private readonly tileIndexName: string;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.REDIS) private readonly redis: RedisClient,
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    private readonly kitManager: KitManager
  ) {
    this.keyPrefix = this.config.get<RedisConfig>('redis').keyPrefix;
    this.tileIndexName = tileIndexName(this.keyPrefix);
  }

  public async queryTilesDetails(params: TilesDetailsQueryParams): Promise<TileQueryResponse> {
    let response: AggregateReply;

    this.logger.info({ msg: 'quering tile details', ...params });

    const { cursor, minZoom, maxZoom, minState, maxState, shouldMatchCurrentState, kits, bbox, size } = params;

    const stateProperty = shouldMatchCurrentState === true ? 'state' : 'states';
    const stateFilter = minState !== undefined || maxState !== undefined ? ` @${stateProperty}:[${minState ?? '-inf'} ${maxState ?? '+inf'}] ` : ' ';

    const query = `@z:[${minZoom} ${maxZoom}]${stateFilter}@kit:(${kits.join('|')}) @geoshape:[WITHIN $${SEARCHED_GEOSHAPE_NAME}]`;

    const geoshape = bboxToWktPolygon(bbox);
    /* eslint-disable @typescript-eslint/naming-convention */ // node-redis does not follow eslint naming convention
    const options = {
      DIALECT: REDIS_SEARCH_DIALECT,
      PARAMS: { [SEARCHED_GEOSHAPE_NAME]: geoshape },
      LOAD: LOAD_FIELDS,
      TIMEOUT: 0,
      COUNT: size ?? DEFAULT_PAGE_SIZE,
    };

    if (cursor === undefined) {
      response = await this.redis.ft.aggregateWithCursor(this.tileIndexName, query, options);
    } else {
      response = await this.redis.ft.cursorRead(this.tileIndexName, cursor, { COUNT: size ?? DEFAULT_PAGE_SIZE });
    }
    /* eslint-enable @typescript-eslint/naming-convention */

    this.logger.debug({
      cursor,
      query,
      options,
      response: {
        total: response.total,
        resultsCount: response.results.length,
        cursor: response.cursor,
      },
    });

    if (response.results.length === 0) {
      return { tiles: [], cursor: response.cursor };
    }

    const tilesDetails = response.results.map((document) => transformDocument(document));

    return { tiles: tilesDetails as unknown as TileDetails[], cursor: response.cursor };
  }

  public async getTileDetailsByKit(params: TileParamsWithKit): Promise<TileDetails> {
    this.logger.info({ msg: 'getting tile details by kit', ...params });

    const { kit, ...tileParams } = params;
    const result = await this.getTilesDetailsByKits({ ...tileParams, kits: [kit] });

    if (result.length === 0) {
      this.logger.error({ msg: 'tile details not found', ...params });
      throw new TileDetailsNotFoundError(`kit's ${kit} tile ${params.z}/${params.x}/${params.y} details were not found`);
    }

    return result[0];
  }

  public async getTilesDetailsByKits(params: TileParams & { kits: string[] }): Promise<TileDetails[]> {
    this.logger.info({ msg: 'getting tile details on selected kits', ...params, kitsCount: params.kits.length });

    const { kits, ...tileParams } = params;
    const keys = kits.map((kit) => keyfy({ ...tileParams, kit }, this.keyPrefix));
    const result = (await this.redis.json.mGet(keys, '$')) as unknown as [[TileDetails]];
    const tilesDetails = result.flat().filter((element: TileDetails | null) => element !== null);

    return tilesDetails;
  }

  public async getTilesDetailsByZXY(tileParams: TileParams): Promise<TileDetails[]> {
    this.logger.info({ msg: 'quering tile details', ...tileParams });
    const { z, x, y } = tileParams;

    /* eslint-disable @typescript-eslint/naming-convention */ // node-redis does not follow eslint nmaing convention
    const result = await this.redis.ft.search(this.tileIndexName, `@z:[${z} ${z}] @x:[${x} ${x}] @y:[${y} ${y}]`, {
      LIMIT: DEFAULT_LIMIT,
    });

    this.logger.debug({
      search: {
        z,
        x,
        y,
        LIMIT: DEFAULT_LIMIT,
      },
      result,
    });
    /* eslint-enable @typescript-eslint/naming-convention */

    if (result.total === 0) {
      return [];
    }

    const tilesDetails = result.documents.map((document) => document.value);

    return tilesDetails as unknown as TileDetails[];
  }

  public async upsertTilesDetails(params: TileParamsWithKit, payload: TileDetailsPayload): Promise<UpsertStatus> {
    this.logger.info({ msg: 'upsterting tile details', params, payload });

    const existingKit = (await this.redis.hGet(kitHashKey(params.kit, this.keyPrefix), 'name')) as string | null;

    if (existingKit === null) {
      throw new KitNotFoundError(`kit ${params.kit} does not exists`);
    }

    const key = keyfy(params, this.keyPrefix);

    try {
      return await this.redis.executeIsolated(async (isolatedClient) => {
        await isolatedClient.watch(key);

        const keyExistCounter = await isolatedClient.exists(key);

        // init a transaction, if key is changed until exec is invoked WatchError will be thrown
        const transaction = isolatedClient.multi();

        if (keyExistCounter === 1) {
          const state = payload.state ?? UNSPECIFIED_STATE;

          transaction.json.arrAppend(key, '$.states', state);
          transaction.json.numIncrBy(key, '$.updateCount', 1);

          const jsonMSetItems: Parameters<typeof transaction.json.mSet> = [
            [
              { key, path: '$.state', value: state },
              { key, path: '$.updatedAt', value: payload.timestamp },
            ],
          ];

          if (payload.status === 'rendered') {
            transaction.json.numIncrBy(key, '$.renderCount', 1);
            jsonMSetItems[0].push({ key, path: '$.renderedAt', value: payload.timestamp });
          } else if (payload.status === 'skipped') {
            transaction.json.numIncrBy(key, '$.skipCount', 1);
          } else if (payload.status === 'cooled') {
            transaction.json.numIncrBy(key, '$.coolCount', 1);
          }

          transaction.json.mSet(jsonMSetItems.flat());

          await transaction.exec();

          try {
            await this.kitManager.updateMaxValues(params.kit, state, payload.timestamp);
          } catch (err) {
            // the tile write above already committed; a failure here must not surface as an upsert failure,
            // or the caller will retry and double-count the counters incremented in the transaction above
            this.logger.error({ msg: 'failed updating kit max values after a successful tile upsert', err, key, params, payload });
          }

          return UpsertStatus.UPDATED;
        }

        const tile = { z: params.z, x: params.x, y: params.y, metatile: METATILE_SIZE };
        const bbox = tileToBoundingBox(tile, TILEGRID_WORLD_CRS84, true);

        const wkt = bboxToWktPolygon(bbox);
        const tileCoordinates = bboxToLonLat(bbox);
        const state = payload.state ?? UNSPECIFIED_STATE;
        const initialTileDetails: TileDetails = {
          z: params.z,
          x: params.x,
          y: params.y,
          kit: params.kit,
          state: state,
          states: [state],
          updatedAt: payload.timestamp,
          createdAt: payload.timestamp,
          renderedAt: payload.timestamp,
          ...NEWLY_INSERTED_TILE_COUNTERS,
          geoshape: wkt,
          coordinates: stringifyCoordinates(tileCoordinates),
        };

        transaction.json.set(key, '$', { ...initialTileDetails });

        await transaction.exec();

        try {
          await this.kitManager.updateMaxValues(params.kit, state, payload.timestamp);
        } catch (err) {
          // the tile write above already committed; a failure here must not surface as an upsert failure,
          // or the caller will retry and double-count the counters set by the transaction above
          this.logger.error({ msg: 'failed updating kit max values after a successful tile upsert', err, key, params, payload });
        }

        return UpsertStatus.INSERTED;
      });
    } catch (err) {
      if (err instanceof WatchError) {
        this.logger.error({ msg: 'transaction discarded due to watch error', key, params, payload });
      }
      throw err;
    }
  }
}

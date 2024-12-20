/* eslint-disable @typescript-eslint/naming-convention */ // redis commands and args do not follow convention
import { KitMetadata, TileDetailsPayload, TileParams, TileParamsWithKit, UNSPECIFIED_STATE } from '@map-colonies/detiler-common';
import jsLogger from '@map-colonies/js-logger';
import { createClient, WatchError } from 'redis';
import {
  REDIS_KITS_HASH_PREFIX,
  REDIS_SEARCH_DIALECT,
  REDIS_TILE_INDEX_NAME,
  SEARCHED_GEOSHAPE_NAME,
  TILE_DETAILS_KEY_PREFIX,
} from '../../../src/common/constants';
import { bboxToWktPolygon, UpsertStatus } from '../../../src/common/util';
import { DEFAULT_LIMIT, DEFAULT_PAGE_SIZE } from '../../../src/redis';
import { KitNotFoundError, TileDetailsNotFoundError } from '../../../src/tileDetails/models/errors';
import { TileDetailsManager, TilesDetailsQueryParams } from '../../../src/tileDetails/models/tileDetailsManager';
import { LOAD_FIELDS, NEWLY_INSERTED_TILE_COUNTERS } from '../../../src/tileDetails/models/util';

const mGetMock = jest.fn();
const searchMock = jest.fn();
const hGetMock = jest.fn();
const mSetMock = jest.fn();
const setMock = jest.fn();
const numIncrByMock = jest.fn();
const arrAppendMock = jest.fn();

const executeIsolatedMock = jest.fn();
const watchMock = jest.fn();
const existsMock = jest.fn();
const multiMock = jest.fn();
const execMock = jest.fn();
const aggregateWithCursorMock = jest.fn();
const cursorReadMock = jest.fn();

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
jest.mock('redis', () => ({
  ...jest.requireActual('redis'),
  ...jest.requireActual('@redis/client/dist/lib/errors'),
  createClient: jest.fn().mockImplementation(() => ({
    hGet: hGetMock,
    executeIsolated: executeIsolatedMock,
    watch: watchMock,
    exists: existsMock,
    multi: multiMock,
    exec: execMock,
    json: {
      mGet: mGetMock,
      MGET: mGetMock,
      set: setMock,
      mSet: mSetMock,
      numIncrBy: numIncrByMock,
      arrAppend: arrAppendMock,
    },
    ft: {
      search: searchMock,
      SEARCH: searchMock,
      aggregateWithCursor: aggregateWithCursorMock,
      cursorRead: cursorReadMock,
    },
  })),
}));

type RedisClient = ReturnType<typeof createClient>;

describe('TileDetailsManager', () => {
  let manager: TileDetailsManager;
  let mockedRedis: jest.Mocked<RedisClient>;

  beforeAll(() => {
    mockedRedis = createClient() as jest.Mocked<RedisClient>;
    manager = new TileDetailsManager(jsLogger({ enabled: false }), mockedRedis);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('#queryTilesDetails', () => {
    it('should aggregate search accoring to given params and handle empty result', async () => {
      const params: TilesDetailsQueryParams = {
        minZoom: 0,
        maxZoom: 10,
        size: 10,
        kits: ['kit1'],
        bbox: { east: 1, north: 2, south: 3, west: 4 },
      };
      aggregateWithCursorMock.mockResolvedValue({ results: [], cursor: undefined });
      const index = REDIS_TILE_INDEX_NAME;
      const query = `@z:[${params.minZoom} ${params.maxZoom}] @kit:(kit1) @geoshape:[WITHIN $${SEARCHED_GEOSHAPE_NAME}]`;
      const options = {
        DIALECT: REDIS_SEARCH_DIALECT,
        PARAMS: { [SEARCHED_GEOSHAPE_NAME]: bboxToWktPolygon(params.bbox) },
        LOAD: LOAD_FIELDS,
        TIMEOUT: 0,
        COUNT: params.size,
      };

      const response = await manager.queryTilesDetails(params);

      expect(response).toMatchObject({ tiles: [], cursor: undefined });
      expect(aggregateWithCursorMock).toHaveBeenCalledTimes(1);
      expect(aggregateWithCursorMock).toHaveBeenCalledWith(index, query, options);
    });

    it('should aggregate search accoring to given params and handle single result', async () => {
      const params: TilesDetailsQueryParams = {
        minZoom: 0,
        maxZoom: 10,
        size: 10,
        kits: ['kit1'],
        bbox: { east: 1, north: 2, south: 3, west: 4 },
      };
      aggregateWithCursorMock.mockResolvedValue({ results: [{ a: '1' }], cursor: undefined });
      const index = REDIS_TILE_INDEX_NAME;
      const query = `@z:[${params.minZoom} ${params.maxZoom}] @kit:(kit1) @geoshape:[WITHIN $${SEARCHED_GEOSHAPE_NAME}]`;
      const options = {
        DIALECT: REDIS_SEARCH_DIALECT,
        PARAMS: { [SEARCHED_GEOSHAPE_NAME]: bboxToWktPolygon(params.bbox) },
        LOAD: LOAD_FIELDS,
        TIMEOUT: 0,
        COUNT: params.size,
      };

      const response = await manager.queryTilesDetails(params);

      expect(response).toMatchObject({ tiles: [{ a: 1 }], cursor: undefined });
      expect(aggregateWithCursorMock).toHaveBeenCalledTimes(1);
      expect(aggregateWithCursorMock).toHaveBeenCalledWith(index, query, options);
    });

    it('should aggregate search accoring to given params and handle multiple results', async () => {
      const params: TilesDetailsQueryParams = {
        minZoom: 0,
        maxZoom: 10,
        size: 10,
        kits: ['kit1', 'kit2'],
        bbox: { east: 1, north: 2, south: 3, west: 4 },
      };
      aggregateWithCursorMock.mockResolvedValue({ total: 2, results: [{ a: '1' }, { a: '2' }], cursor: undefined });
      const index = REDIS_TILE_INDEX_NAME;
      const query = `@z:[${params.minZoom} ${params.maxZoom}] @kit:(kit1|kit2) @geoshape:[WITHIN $${SEARCHED_GEOSHAPE_NAME}]`;
      const searchParams = {
        DIALECT: REDIS_SEARCH_DIALECT,
        PARAMS: { [SEARCHED_GEOSHAPE_NAME]: bboxToWktPolygon(params.bbox) },
        LOAD: LOAD_FIELDS,
        TIMEOUT: 0,
        COUNT: params.size,
      };

      const response = await manager.queryTilesDetails(params);

      expect(response).toMatchObject({ tiles: [{ a: 1 }, { a: 2 }], cursor: undefined });
      expect(aggregateWithCursorMock).toHaveBeenCalledTimes(1);
      expect(aggregateWithCursorMock).toHaveBeenCalledWith(index, query, searchParams);
    });

    it('should aggregate search accoring to given params including minState', async () => {
      const params: TilesDetailsQueryParams = {
        minZoom: 0,
        maxZoom: 10,
        minState: 100,
        shouldMatchCurrentState: true,
        size: 10,
        kits: ['kit1', 'kit2'],
        bbox: { east: 1, north: 2, south: 3, west: 4 },
      };
      aggregateWithCursorMock.mockResolvedValue({ results: [{ a: '1' }, { a: 'abc' }] });
      const index = REDIS_TILE_INDEX_NAME;
      const query = `@z:[${params.minZoom} ${params.maxZoom}] @state:[${params.minState} +inf] @kit:(kit1|kit2) @geoshape:[WITHIN $${SEARCHED_GEOSHAPE_NAME}]`;
      const searchParams = {
        DIALECT: REDIS_SEARCH_DIALECT,
        PARAMS: { [SEARCHED_GEOSHAPE_NAME]: bboxToWktPolygon(params.bbox) },
        LOAD: LOAD_FIELDS,
        TIMEOUT: 0,
        COUNT: params.size,
      };

      const response = await manager.queryTilesDetails(params);

      expect(response).toMatchObject({ tiles: [{ a: 1 }, { a: 'abc' }], cursor: undefined });
      expect(aggregateWithCursorMock).toHaveBeenCalledTimes(1);
      expect(aggregateWithCursorMock).toHaveBeenCalledWith(index, query, searchParams);
    });

    it('should aggregate search accoring to given params including maxState', async () => {
      const params: TilesDetailsQueryParams = {
        minZoom: 0,
        maxZoom: 10,
        maxState: 100,
        size: 10,
        kits: ['kit1', 'kit2'],
        bbox: { east: 1, north: 2, south: 3, west: 4 },
      };
      aggregateWithCursorMock.mockResolvedValue({ results: [{ a: '1' }, { a: '2' }], cursor: undefined });
      const index = REDIS_TILE_INDEX_NAME;
      const query = `@z:[${params.minZoom} ${params.maxZoom}] @states:[-inf ${params.maxState}] @kit:(kit1|kit2) @geoshape:[WITHIN $${SEARCHED_GEOSHAPE_NAME}]`;
      const searchParams = {
        DIALECT: REDIS_SEARCH_DIALECT,
        PARAMS: { [SEARCHED_GEOSHAPE_NAME]: bboxToWktPolygon(params.bbox) },
        LOAD: LOAD_FIELDS,
        TIMEOUT: 0,
        COUNT: params.size,
      };

      const response = await manager.queryTilesDetails(params);

      expect(response).toMatchObject({ tiles: [{ a: 1 }, { a: 2 }], cursor: undefined });
      expect(aggregateWithCursorMock).toHaveBeenCalledTimes(1);
      expect(aggregateWithCursorMock).toHaveBeenCalledWith(index, query, searchParams);
    });

    it('should aggregate search accoring to given params including minState and maxState', async () => {
      const params: TilesDetailsQueryParams = {
        minZoom: 0,
        maxZoom: 10,
        shouldMatchCurrentState: true,
        minState: -1,
        maxState: 100,
        size: 10,
        kits: ['kit1', 'kit2'],
        bbox: { east: 1, north: 2, south: 3, west: 4 },
      };
      aggregateWithCursorMock.mockResolvedValue({ results: [{ a: '1' }, { a: '2' }], cursor: undefined });
      const index = REDIS_TILE_INDEX_NAME;
      const query = `@z:[${params.minZoom} ${params.maxZoom}] @state:[${params.minState} ${params.maxState}] @kit:(kit1|kit2) @geoshape:[WITHIN $${SEARCHED_GEOSHAPE_NAME}]`;
      const searchParams = {
        DIALECT: REDIS_SEARCH_DIALECT,
        PARAMS: { [SEARCHED_GEOSHAPE_NAME]: bboxToWktPolygon(params.bbox) },
        LOAD: LOAD_FIELDS,
        TIMEOUT: 0,
        COUNT: params.size,
      };

      const response = await manager.queryTilesDetails(params);

      expect(response).toMatchObject({ tiles: [{ a: 1 }, { a: 2 }], cursor: undefined });
      expect(aggregateWithCursorMock).toHaveBeenCalledTimes(1);
      expect(aggregateWithCursorMock).toHaveBeenCalledWith(index, query, searchParams);
    });

    it('should continue aggregate search accoring to given params which include the cursor id', async () => {
      const params: TilesDetailsQueryParams = {
        minZoom: 0,
        maxZoom: 10,
        size: 10,
        kits: ['kit1', 'kit2'],
        bbox: { east: 1, north: 2, south: 3, west: 4 },
        cursor: 666,
      };
      cursorReadMock.mockResolvedValue({ results: [{ a: '1' }, { a: '2' }], cursor: 667 });
      const index = REDIS_TILE_INDEX_NAME;

      const response = await manager.queryTilesDetails(params);

      expect(response).toMatchObject({ tiles: [{ a: 1 }, { a: 2 }], cursor: 667 });
      expect(cursorReadMock).toHaveBeenCalledTimes(1);
      expect(cursorReadMock).toHaveBeenCalledWith(index, params.cursor, { COUNT: params.size });
    });

    it('should continue aggregate search accoring to given params which include the cursor id and no size', async () => {
      const params: TilesDetailsQueryParams = {
        minZoom: 0,
        maxZoom: 10,
        kits: ['kit1', 'kit2'],
        bbox: { east: 1, north: 2, south: 3, west: 4 },
        cursor: 666,
      };
      cursorReadMock.mockResolvedValue({ results: [{ a: '1' }, { a: '2' }], cursor: 667 });
      const index = REDIS_TILE_INDEX_NAME;

      const response = await manager.queryTilesDetails(params);

      expect(response).toMatchObject({ tiles: [{ a: 1 }, { a: 2 }], cursor: 667 });
      expect(cursorReadMock).toHaveBeenCalledTimes(1);
      expect(cursorReadMock).toHaveBeenCalledWith(index, params.cursor, { COUNT: DEFAULT_PAGE_SIZE });
    });
  });

  describe('#getTileDetailsByKit', () => {
    it('should call for mget once for a single kit', async () => {
      const params: TileParamsWithKit = { z: 1, x: 0, y: 0, kit: 'kit1' };
      mGetMock.mockResolvedValue([[{ a: 1 }]]);

      const response = await manager.getTileDetailsByKit(params);

      expect(response).toMatchObject({ a: 1 });
      expect(mGetMock).toHaveBeenCalledTimes(1);
      expect(mGetMock).toHaveBeenCalledWith([`${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`], '$');
    });

    it('should call for mget once and if result is nullish throw error', async () => {
      const params: TileParamsWithKit = { z: 1, x: 0, y: 0, kit: 'kit1' };
      mGetMock.mockResolvedValue([[null]]);
      const expected = new TileDetailsNotFoundError(`kit's ${params.kit} tile ${params.z}/${params.x}/${params.y} details were not found`);

      await expect(manager.getTileDetailsByKit(params)).rejects.toThrow(expected);

      expect(mGetMock).toHaveBeenCalledTimes(1);
      expect(mGetMock).toHaveBeenCalledWith([`${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`], '$');
    });
  });

  describe('#getTilesDetailsByKits', () => {
    it('should call for mget once for a single kit', async () => {
      const params: TileParams & { kits: string[] } = { kits: ['kit1'], z: 1, x: 0, y: 0 };
      mGetMock.mockResolvedValue([[{ a: 1 }]]);

      const response = await manager.getTilesDetailsByKits(params);

      expect(response).toMatchObject([{ a: 1 }]);
      expect(mGetMock).toHaveBeenCalledTimes(1);
      expect(mGetMock).toHaveBeenCalledWith([`${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`], '$');
    });

    it('should call for mget once for a multiple kits and filter out the nullish', async () => {
      const params: TileParams & { kits: string[] } = { kits: ['kit1', 'kit2'], z: 1, x: 0, y: 0 };
      mGetMock.mockResolvedValue([[{ a: 1 }, null]]);

      const response = await manager.getTilesDetailsByKits(params);

      expect(response).toMatchObject([{ a: 1 }]);
      expect(mGetMock).toHaveBeenCalledTimes(1);
      expect(mGetMock).toHaveBeenCalledWith([`${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, `${TILE_DETAILS_KEY_PREFIX}:kit2:1/0/0`], '$');
    });
  });

  describe('#getTilesDetailsByZXY', () => {
    it('should search for all tiles matching the given xyz params and handle single document', async () => {
      const params: TileParams = { z: 1, x: 0, y: 0 };
      searchMock.mockResolvedValue({ documents: [{ value: { a: 1 } }], total: 1 });

      const response = await manager.getTilesDetailsByZXY(params);

      expect(response).toMatchObject([{ a: 1 }]);
      expect(searchMock).toHaveBeenCalledTimes(1);
      expect(searchMock).toHaveBeenCalledWith(
        REDIS_TILE_INDEX_NAME,
        `@z:[${params.z} ${params.z}] @x:[${params.x} ${params.x}] @y:[${params.y} ${params.y}]`,
        { LIMIT: DEFAULT_LIMIT }
      );
    });

    it('should search for all tiles matching the given xyz params and handle multiple documents', async () => {
      const params: TileParams = { z: 1, x: 0, y: 0 };
      searchMock.mockResolvedValue({ documents: [{ value: { a: 1 } }, { value: { a: 2 } }], total: 2 });

      const response = await manager.getTilesDetailsByZXY(params);

      expect(response).toMatchObject([{ a: 1 }, { a: 2 }]);
      expect(searchMock).toHaveBeenCalledTimes(1);
      expect(searchMock).toHaveBeenCalledWith(
        REDIS_TILE_INDEX_NAME,
        `@z:[${params.z} ${params.z}] @x:[${params.x} ${params.x}] @y:[${params.y} ${params.y}]`,
        { LIMIT: DEFAULT_LIMIT }
      );
    });

    it('should search for all tiles matching the given xyz params and handle no documents', async () => {
      const params: TileParams = { z: 1, x: 0, y: 0 };
      searchMock.mockResolvedValue({ documents: [], total: 0 });

      const response = await manager.getTilesDetailsByZXY(params);

      expect(response).toMatchObject([]);
      expect(searchMock).toHaveBeenCalledTimes(1);
      expect(searchMock).toHaveBeenCalledWith(
        REDIS_TILE_INDEX_NAME,
        `@z:[${params.z} ${params.z}] @x:[${params.x} ${params.x}] @y:[${params.y} ${params.y}]`,
        { LIMIT: DEFAULT_LIMIT }
      );
    });
  });

  describe('#upsertTilesDetails', () => {
    it('should throw kit not found error if requested tile kit not found', async () => {
      const params: TileParamsWithKit = {
        kit: 'kit1',
        z: 1,
        x: 0,
        y: 0,
      };
      const payload: TileDetailsPayload = { timestamp: 1000 };
      hGetMock.mockResolvedValue(null);
      const expected = new KitNotFoundError(`kit ${params.kit} does not exists`);

      await expect(manager.upsertTilesDetails(params, payload)).rejects.toThrow(expected);

      expect(hGetMock).toHaveBeenCalledTimes(1);
      expect(hGetMock).toHaveBeenCalledWith(`${REDIS_KITS_HASH_PREFIX}:${params.kit}`, 'name');
      expect(mSetMock).not.toHaveBeenCalled();
      expect(setMock).not.toHaveBeenCalled();
      expect(numIncrByMock).not.toHaveBeenCalled();
    });

    it('should create in transaction the tile according to params and payload with unspecified state if key does not exist', async () => {
      executeIsolatedMock.mockImplementation(async (fn: (client: RedisClient) => Promise<unknown>) => fn(mockedRedis));
      multiMock.mockReturnValue(mockedRedis);
      const exisingKits: KitMetadata[] = [{ name: 'kit1' }];
      hGetMock.mockResolvedValue(exisingKits[0].name);
      existsMock.mockResolvedValue(0);

      const params: TileParamsWithKit = {
        kit: 'kit1',
        z: 1,
        x: 0,
        y: 0,
      };
      const payload: TileDetailsPayload = { timestamp: 1000 };

      const response = await manager.upsertTilesDetails(params, payload);

      expect(response).toBe(UpsertStatus.INSERTED);
      expect(hGetMock).toHaveBeenCalledTimes(1);
      expect(hGetMock).toHaveBeenCalledWith(`${REDIS_KITS_HASH_PREFIX}:${params.kit}`, 'name');
      expect(executeIsolatedMock).toHaveBeenCalledTimes(1);
      expect(watchMock).toHaveBeenCalledTimes(1);
      expect(existsMock).toHaveBeenCalledTimes(1);
      expect(multiMock).toHaveBeenCalledTimes(1);
      expect(mSetMock).not.toHaveBeenCalled();
      expect(numIncrByMock).not.toHaveBeenCalled();
      expect(setMock).toHaveBeenCalledTimes(1);
      expect(setMock).toHaveBeenCalledWith(
        `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`,
        '$',
        expect.objectContaining({
          ...params,
          state: UNSPECIFIED_STATE,
          states: [UNSPECIFIED_STATE],
          createdAt: payload.timestamp,
          updatedAt: payload.timestamp,
          ...NEWLY_INSERTED_TILE_COUNTERS,
        })
      );
      expect(execMock).toHaveBeenCalledTimes(1);
    });

    it('should create in transaction the tile according to params and payload with state if key does not exist', async () => {
      executeIsolatedMock.mockImplementation(async (fn: (client: RedisClient) => Promise<unknown>) => fn(mockedRedis));
      multiMock.mockReturnValue(mockedRedis);
      const exisingKits: KitMetadata[] = [{ name: 'kit1' }];
      hGetMock.mockResolvedValue(exisingKits);
      existsMock.mockResolvedValue(0);

      const params: TileParamsWithKit = {
        kit: 'kit1',
        z: 1,
        x: 0,
        y: 0,
      };
      const payload: TileDetailsPayload = { state: 666, timestamp: 1000 };

      const response = await manager.upsertTilesDetails(params, payload);

      expect(response).toBe(UpsertStatus.INSERTED);
      expect(hGetMock).toHaveBeenCalledTimes(1);
      expect(hGetMock).toHaveBeenCalledWith(`${REDIS_KITS_HASH_PREFIX}:${params.kit}`, 'name');
      expect(executeIsolatedMock).toHaveBeenCalledTimes(1);
      expect(watchMock).toHaveBeenCalledTimes(1);
      expect(existsMock).toHaveBeenCalledTimes(1);
      expect(multiMock).toHaveBeenCalledTimes(1);
      expect(mSetMock).not.toHaveBeenCalled();
      expect(numIncrByMock).not.toHaveBeenCalled();
      expect(setMock).toHaveBeenCalledTimes(1);
      expect(setMock).toHaveBeenCalledWith(
        `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`,
        '$',
        expect.objectContaining({
          ...params,
          state: 666,
          states: [666],
          createdAt: payload.timestamp,
          updatedAt: payload.timestamp,
          renderedAt: payload.timestamp,
          ...NEWLY_INSERTED_TILE_COUNTERS,
        })
      );
      expect(execMock).toHaveBeenCalledTimes(1);
    });

    it('should update in transaction the tile according to params and payload with unspecified state if key does not exist', async () => {
      executeIsolatedMock.mockImplementation(async (fn: (client: RedisClient) => Promise<unknown>) => fn(mockedRedis));
      multiMock.mockReturnValue(mockedRedis);
      const exisingKits: KitMetadata[] = [{ name: 'kit1' }];
      hGetMock.mockResolvedValue(exisingKits);
      existsMock.mockResolvedValue(1);

      const params: TileParamsWithKit = {
        kit: 'kit1',
        z: 1,
        x: 0,
        y: 0,
      };
      const payload: TileDetailsPayload = { status: 'rendered', timestamp: 1000 };

      const response = await manager.upsertTilesDetails(params, payload);

      expect(response).toBe(UpsertStatus.UPDATED);
      expect(hGetMock).toHaveBeenCalledTimes(1);
      expect(hGetMock).toHaveBeenCalledWith(`${REDIS_KITS_HASH_PREFIX}:${params.kit}`, 'name');
      expect(executeIsolatedMock).toHaveBeenCalledTimes(1);
      expect(watchMock).toHaveBeenCalledTimes(1);
      expect(existsMock).toHaveBeenCalledTimes(1);
      expect(multiMock).toHaveBeenCalledTimes(1);
      expect(mSetMock).toHaveBeenCalledTimes(1);
      expect(mSetMock).toHaveBeenCalledWith([
        { key: `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, path: '$.state', value: UNSPECIFIED_STATE },
        { key: `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, path: '$.updatedAt', value: payload.timestamp },
        { key: `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, path: '$.renderedAt', value: payload.timestamp },
      ]);
      expect(numIncrByMock).toHaveBeenCalledTimes(2);
      expect(numIncrByMock).toHaveBeenNthCalledWith(1, `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, '$.updateCount', 1);
      expect(numIncrByMock).toHaveBeenNthCalledWith(2, `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, '$.renderCount', 1);
      expect(arrAppendMock).toHaveBeenCalledTimes(1);
      expect(arrAppendMock).toHaveBeenCalledWith(`${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, '$.states', UNSPECIFIED_STATE);
      expect(setMock).not.toHaveBeenCalled();
      expect(execMock).toHaveBeenCalledTimes(1);
    });

    it('should update in transaction the tile according to params and payload with state if key does not exist', async () => {
      executeIsolatedMock.mockImplementation(async (fn: (client: RedisClient) => Promise<unknown>) => fn(mockedRedis));
      multiMock.mockReturnValue(mockedRedis);
      const exisingKits: KitMetadata[] = [{ name: 'kit1' }];
      hGetMock.mockResolvedValue(exisingKits);
      existsMock.mockResolvedValue(1);

      const params: TileParamsWithKit = {
        kit: 'kit1',
        z: 1,
        x: 0,
        y: 0,
      };
      const payload: TileDetailsPayload = { status: 'rendered', state: 666, timestamp: 1000 };

      const response = await manager.upsertTilesDetails(params, payload);

      expect(response).toBe(UpsertStatus.UPDATED);
      expect(hGetMock).toHaveBeenCalledTimes(1);
      expect(hGetMock).toHaveBeenCalledWith(`${REDIS_KITS_HASH_PREFIX}:${params.kit}`, 'name');
      expect(executeIsolatedMock).toHaveBeenCalledTimes(1);
      expect(watchMock).toHaveBeenCalledTimes(1);
      expect(existsMock).toHaveBeenCalledTimes(1);
      expect(multiMock).toHaveBeenCalledTimes(1);
      expect(mSetMock).toHaveBeenCalledTimes(1);
      expect(mSetMock).toHaveBeenCalledWith([
        { key: `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, path: '$.state', value: payload.state },
        { key: `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, path: '$.updatedAt', value: payload.timestamp },
        { key: `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, path: '$.renderedAt', value: payload.timestamp },
      ]);
      expect(numIncrByMock).toHaveBeenCalledTimes(2);
      expect(numIncrByMock).toHaveBeenNthCalledWith(1, `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, '$.updateCount', 1);
      expect(numIncrByMock).toHaveBeenNthCalledWith(2, `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, '$.renderCount', 1);
      expect(arrAppendMock).toHaveBeenCalledTimes(1);
      expect(arrAppendMock).toHaveBeenCalledWith(`${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, '$.states', payload.state);
      expect(setMock).not.toHaveBeenCalled();
      expect(execMock).toHaveBeenCalledTimes(1);
    });

    it('should update in transaction the tile according to params and payload with skipped status', async () => {
      executeIsolatedMock.mockImplementation(async (fn: (client: RedisClient) => Promise<unknown>) => fn(mockedRedis));
      multiMock.mockReturnValue(mockedRedis);
      const exisingKits: KitMetadata[] = [{ name: 'kit1' }];
      hGetMock.mockResolvedValue(exisingKits);
      existsMock.mockResolvedValue(1);

      const params: TileParamsWithKit = {
        kit: 'kit1',
        z: 1,
        x: 0,
        y: 0,
      };
      const payload: TileDetailsPayload = { status: 'skipped', state: 666, timestamp: 1000 };

      const response = await manager.upsertTilesDetails(params, payload);

      expect(response).toBe(UpsertStatus.UPDATED);
      expect(hGetMock).toHaveBeenCalledTimes(1);
      expect(hGetMock).toHaveBeenCalledWith(`${REDIS_KITS_HASH_PREFIX}:${params.kit}`, 'name');
      expect(executeIsolatedMock).toHaveBeenCalledTimes(1);
      expect(watchMock).toHaveBeenCalledTimes(1);
      expect(existsMock).toHaveBeenCalledTimes(1);
      expect(multiMock).toHaveBeenCalledTimes(1);
      expect(mSetMock).toHaveBeenCalledTimes(1);
      expect(mSetMock).toHaveBeenCalledWith([
        { key: `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, path: '$.state', value: payload.state },
        { key: `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, path: '$.updatedAt', value: payload.timestamp },
      ]);
      expect(numIncrByMock).toHaveBeenCalledTimes(2);
      expect(numIncrByMock).toHaveBeenNthCalledWith(1, `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, '$.updateCount', 1);
      expect(numIncrByMock).toHaveBeenNthCalledWith(2, `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, '$.skipCount', 1);
      expect(arrAppendMock).toHaveBeenCalledTimes(1);
      expect(arrAppendMock).toHaveBeenCalledWith(`${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, '$.states', payload.state);
      expect(setMock).not.toHaveBeenCalled();
      expect(execMock).toHaveBeenCalledTimes(1);
    });

    it('should update in transaction the tile according to params and payload with cooled status', async () => {
      executeIsolatedMock.mockImplementation(async (fn: (client: RedisClient) => Promise<unknown>) => fn(mockedRedis));
      multiMock.mockReturnValue(mockedRedis);
      const exisingKits: KitMetadata[] = [{ name: 'kit1' }];
      hGetMock.mockResolvedValue(exisingKits);
      existsMock.mockResolvedValue(1);

      const params: TileParamsWithKit = {
        kit: 'kit1',
        z: 1,
        x: 0,
        y: 0,
      };
      const payload: TileDetailsPayload = { status: 'cooled', state: 666, timestamp: 1000 };

      const response = await manager.upsertTilesDetails(params, payload);

      expect(response).toBe(UpsertStatus.UPDATED);
      expect(hGetMock).toHaveBeenCalledTimes(1);
      expect(hGetMock).toHaveBeenCalledWith(`${REDIS_KITS_HASH_PREFIX}:${params.kit}`, 'name');
      expect(executeIsolatedMock).toHaveBeenCalledTimes(1);
      expect(watchMock).toHaveBeenCalledTimes(1);
      expect(existsMock).toHaveBeenCalledTimes(1);
      expect(multiMock).toHaveBeenCalledTimes(1);
      expect(mSetMock).toHaveBeenCalledTimes(1);
      expect(mSetMock).toHaveBeenCalledWith([
        { key: `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, path: '$.state', value: payload.state },
        { key: `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, path: '$.updatedAt', value: payload.timestamp },
      ]);
      expect(numIncrByMock).toHaveBeenCalledTimes(2);
      expect(numIncrByMock).toHaveBeenNthCalledWith(1, `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, '$.updateCount', 1);
      expect(numIncrByMock).toHaveBeenNthCalledWith(2, `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, '$.coolCount', 1);
      expect(arrAppendMock).toHaveBeenCalledTimes(1);
      expect(arrAppendMock).toHaveBeenCalledWith(`${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, '$.states', payload.state);
      expect(setMock).not.toHaveBeenCalled();
      expect(execMock).toHaveBeenCalledTimes(1);
    });

    it('should throw if watch error detected', async () => {
      executeIsolatedMock.mockImplementation(async (fn: (client: RedisClient) => Promise<unknown>) => fn(mockedRedis));
      multiMock.mockReturnValue(mockedRedis);
      const exisingKits: KitMetadata[] = [{ name: 'kit1' }];
      hGetMock.mockResolvedValue(exisingKits);
      existsMock.mockResolvedValue(1);
      const expected = new WatchError();
      execMock.mockRejectedValue(expected);

      const params: TileParamsWithKit = {
        kit: 'kit1',
        z: 1,
        x: 0,
        y: 0,
      };
      const payload: TileDetailsPayload = { status: 'rendered', state: 666, timestamp: 1000 };

      await expect(manager.upsertTilesDetails(params, payload)).rejects.toThrow(expected);

      expect(hGetMock).toHaveBeenCalledTimes(1);
      expect(hGetMock).toHaveBeenCalledWith(`${REDIS_KITS_HASH_PREFIX}:${params.kit}`, 'name');
      expect(executeIsolatedMock).toHaveBeenCalledTimes(1);
      expect(watchMock).toHaveBeenCalledTimes(1);
      expect(existsMock).toHaveBeenCalledTimes(1);
      expect(multiMock).toHaveBeenCalledTimes(1);
      expect(mSetMock).toHaveBeenCalledTimes(1);
      expect(mSetMock).toHaveBeenCalledWith([
        { key: `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, path: '$.state', value: payload.state },
        { key: `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, path: '$.updatedAt', value: payload.timestamp },
        { key: `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, path: '$.renderedAt', value: payload.timestamp },
      ]);
      expect(numIncrByMock).toHaveBeenCalledTimes(2);
      expect(numIncrByMock).toHaveBeenNthCalledWith(1, `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, '$.updateCount', 1);
      expect(numIncrByMock).toHaveBeenNthCalledWith(2, `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, '$.renderCount', 1);
      expect(setMock).not.toHaveBeenCalled();
      expect(execMock).toHaveBeenCalledTimes(1);
    });

    it('should throw if some error detected', async () => {
      executeIsolatedMock.mockImplementation(async (fn: (client: RedisClient) => Promise<unknown>) => fn(mockedRedis));
      multiMock.mockReturnValue(mockedRedis);
      const exisingKits: KitMetadata[] = [{ name: 'kit1' }];
      hGetMock.mockResolvedValue(exisingKits);
      existsMock.mockResolvedValue(1);
      const expected = new Error('transaction errored');
      execMock.mockRejectedValue(expected);

      const params: TileParamsWithKit = {
        kit: 'kit1',
        z: 1,
        x: 0,
        y: 0,
      };
      const payload: TileDetailsPayload = { status: 'rendered', state: 666, timestamp: 1000 };

      await expect(manager.upsertTilesDetails(params, payload)).rejects.toThrow(expected);

      expect(hGetMock).toHaveBeenCalledTimes(1);
      expect(hGetMock).toHaveBeenCalledWith(`${REDIS_KITS_HASH_PREFIX}:${params.kit}`, 'name');
      expect(executeIsolatedMock).toHaveBeenCalledTimes(1);
      expect(watchMock).toHaveBeenCalledTimes(1);
      expect(existsMock).toHaveBeenCalledTimes(1);
      expect(multiMock).toHaveBeenCalledTimes(1);
      expect(mSetMock).toHaveBeenCalledTimes(1);
      expect(mSetMock).toHaveBeenCalledWith([
        { key: `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, path: '$.state', value: payload.state },
        { key: `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, path: '$.updatedAt', value: payload.timestamp },
        { key: `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, path: '$.renderedAt', value: payload.timestamp },
      ]);
      expect(numIncrByMock).toHaveBeenCalledTimes(2);
      expect(numIncrByMock).toHaveBeenNthCalledWith(1, `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, '$.updateCount', 1);
      expect(numIncrByMock).toHaveBeenNthCalledWith(2, `${TILE_DETAILS_KEY_PREFIX}:kit1:1/0/0`, '$.renderCount', 1);
      expect(setMock).not.toHaveBeenCalled();
      expect(execMock).toHaveBeenCalledTimes(1);
    });
  });
});

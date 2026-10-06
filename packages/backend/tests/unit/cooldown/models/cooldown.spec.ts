/* eslint-disable @typescript-eslint/naming-convention */ // due to redis package
import { beforeAll, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import type { Cooldown, CooldownCreationRequest } from '@map-colonies/detiler-common';
import { jsLogger } from '@map-colonies/js-logger';
import { createClient } from 'redis';
import {
  COOLDOWN_KEY_PREFIX,
  REDIS_COOLDOWN_INDEX_NAME,
  REDIS_SEARCH_DIALECT,
  REDIS_WILDCARD,
  SEARCHED_GEOSHAPE_NAME,
} from '../../../../src/common/constants';
import type { IConfig } from '../../../../src/common/interfaces';
import { CooldownManager } from '../../../../src/cooldown/models/cooldownManager';
import { bboxToWktPolygon, hashValue } from '../../../../src/common/util';
import { HALF_GLOBE_BBOX } from '../../../../src/cooldown/models/constants';

const NOW_MOCK = 1000;

const configMock: IConfig = { get: () => ({ keyPrefix: '' }), has: () => true };

const executeIsolatedMock = vi.fn();
const multiMock = vi.fn();
const expireMock = vi.fn();
const execMock = vi.fn();
const searchMock = vi.fn();
const setMock = vi.fn();

vi.mock('redis', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createClient: vi.fn().mockImplementation(() => ({
    executeIsolated: executeIsolatedMock,
    multi: multiMock,
    expire: expireMock,
    exec: execMock,
    json: {
      set: setMock,
    },
    ft: {
      search: searchMock,
    },
  })),
}));

type RedisClient = ReturnType<typeof createClient>;

describe('CooldownManager', () => {
  let cooldownManager: CooldownManager;
  let mockedRedis: Mocked<RedisClient>;

  beforeAll(async () => {
    mockedRedis = createClient({}) as Mocked<RedisClient>;
    cooldownManager = new CooldownManager(await jsLogger({ enabled: false }), mockedRedis, configMock);
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('#queryCooldowns', () => {
    it('should query cooldowns according to wildcard filter', async () => {
      const params = { from: 0, size: 2 };
      const cooldown1 = { a: 1 };
      const cooldown2 = { b: 2 };
      searchMock.mockResolvedValue({
        documents: [
          { id: 1, value: [cooldown1] },
          { id: 2, value: [cooldown2] },
        ],
        total: 2,
      });

      const response = await cooldownManager.queryCooldowns(params);

      expect(response).toMatchObject([cooldown1, cooldown2]);
      expect(searchMock).toHaveBeenCalledTimes(1);
      expect(searchMock).toHaveBeenCalledWith(REDIS_COOLDOWN_INDEX_NAME, REDIS_WILDCARD, {
        DIALECT: REDIS_SEARCH_DIALECT,
        LIMIT: { from: params.from, size: params.size },
      });
    });

    it('should query cooldowns according to no area filter', async () => {
      const params = { from: 0, size: 2, enabled: true, kits: ['a', 'b'], minZoom: 3, maxZoom: 4 };
      const cooldown1 = { a: 1 };
      const cooldown2 = { b: 2 };
      searchMock.mockResolvedValue({
        documents: [
          { id: 1, value: [cooldown1] },
          { id: 2, value: [cooldown2] },
        ],
        total: 2,
      });

      const response = await cooldownManager.queryCooldowns(params);

      expect(response).toMatchObject([cooldown1, cooldown2]);
      expect(searchMock).toHaveBeenCalledTimes(1);
      expect(searchMock).toHaveBeenCalledWith(
        REDIS_COOLDOWN_INDEX_NAME,
        `@kits:{${params.kits[0]}} @kits:{${params.kits[1]}} @minZoom:[-inf ${params.minZoom}] @maxZoom:[${params.maxZoom} inf] @enabled:{${params.enabled}}`,
        { DIALECT: REDIS_SEARCH_DIALECT, LIMIT: { from: params.from, size: params.size } }
      );
    });

    it('should query cooldowns according to filter with area', async () => {
      const area: [number, number, number, number] = [1, 2, 3, 4];
      const params = { from: 0, size: 2, enabled: true, kits: ['a', 'b'], minZoom: 3, maxZoom: 4, area };
      const cooldown1 = { a: 1 };
      const cooldown2 = { b: 2 };
      searchMock.mockResolvedValue({
        documents: [
          { id: 1, value: [cooldown1] },
          { id: 2, value: [cooldown2] },
        ],
        total: 2,
      });

      const response = await cooldownManager.queryCooldowns(params);

      expect(response).toMatchObject([cooldown1, cooldown2]);
      expect(searchMock).toHaveBeenCalledTimes(1);
      expect(searchMock).toHaveBeenCalledWith(
        REDIS_COOLDOWN_INDEX_NAME,
        `@geoshape:[CONTAINS $${SEARCHED_GEOSHAPE_NAME}] @kits:{${params.kits[0]}} @kits:{${params.kits[1]}} @minZoom:[-inf ${params.minZoom}] @maxZoom:[${params.maxZoom} inf] @enabled:{${params.enabled}}`,
        {
          DIALECT: REDIS_SEARCH_DIALECT,
          LIMIT: { from: params.from, size: params.size },
          PARAMS: {
            [SEARCHED_GEOSHAPE_NAME]: 'POLYGON ((1 4, 1 2, 3 2, 3 4, 1 4))',
          },
        }
      );
    });

    it('should query cooldowns according to filter and return empty array if no result was found', async () => {
      const params = { from: 0, size: 2, enabled: true, kits: ['a', 'b'], minZoom: 3, maxZoom: 4 };
      searchMock.mockResolvedValue({ documents: [], total: 0 });

      const response = await cooldownManager.queryCooldowns(params);

      expect(response).toMatchObject([]);
      expect(searchMock).toHaveBeenCalledTimes(1);
      expect(searchMock).toHaveBeenCalledWith(
        REDIS_COOLDOWN_INDEX_NAME,
        `@kits:{${params.kits[0]}} @kits:{${params.kits[1]}} @minZoom:[-inf ${params.minZoom}] @maxZoom:[${params.maxZoom} inf] @enabled:{${params.enabled}}`,
        { DIALECT: REDIS_SEARCH_DIALECT, LIMIT: { from: params.from, size: params.size } }
      );
    });
  });

  describe('#createCooldown', () => {
    it('should create a new cooldown with no ttl and default area', async () => {
      vi.spyOn(Date, 'now').mockImplementation(() => NOW_MOCK);
      executeIsolatedMock.mockImplementation(async (fn: (client: RedisClient) => Promise<unknown>) => fn(mockedRedis));
      multiMock.mockReturnValue(mockedRedis);

      const newCooldownRequest: CooldownCreationRequest = { enabled: true, duration: 100, kits: ['a'], minZoom: 0, maxZoom: 1 };
      const expectedToBeHashed = { ...newCooldownRequest, geoshape: bboxToWktPolygon(HALF_GLOBE_BBOX) };
      const expected: Cooldown = { ...expectedToBeHashed, createdAt: NOW_MOCK, updatedAt: NOW_MOCK };
      const expectedKey = `${COOLDOWN_KEY_PREFIX}:${hashValue(expectedToBeHashed)}`;

      await cooldownManager.createCooldown(newCooldownRequest);

      expect(executeIsolatedMock).toHaveBeenCalledTimes(1);
      expect(multiMock).toHaveBeenCalledTimes(1);
      expect(setMock).toHaveBeenCalledTimes(1);
      expect(setMock).toHaveBeenCalledWith(expectedKey, '$', expected);
      expect(expireMock).not.toHaveBeenCalled();
      expect(execMock).toHaveBeenCalledTimes(1);
    });

    it('should create a new cooldown with ttl and default area', async () => {
      vi.spyOn(Date, 'now').mockImplementation(() => NOW_MOCK);
      executeIsolatedMock.mockImplementation(async (fn: (client: RedisClient) => Promise<unknown>) => fn(mockedRedis));
      multiMock.mockReturnValue(mockedRedis);

      const newCooldownRequest: CooldownCreationRequest = {
        enabled: true,
        duration: 100,
        kits: ['a'],
        minZoom: 0,
        maxZoom: 1,
        ttl: 1000,
        description: 'desc',
      };
      const expectedToBeHashed = { ...newCooldownRequest, geoshape: bboxToWktPolygon(HALF_GLOBE_BBOX) };
      const expected: Cooldown = { ...expectedToBeHashed, createdAt: NOW_MOCK, updatedAt: NOW_MOCK };
      const expectedKey = `${COOLDOWN_KEY_PREFIX}:${hashValue(expectedToBeHashed)}`;

      await cooldownManager.createCooldown(newCooldownRequest);

      expect(executeIsolatedMock).toHaveBeenCalledTimes(1);
      expect(multiMock).toHaveBeenCalledTimes(1);
      expect(setMock).toHaveBeenCalledTimes(1);
      expect(setMock).toHaveBeenCalledWith(expectedKey, '$', expected);
      expect(expireMock).toHaveBeenCalledTimes(1);
      expect(expireMock).toHaveBeenCalledWith(expectedKey, newCooldownRequest.ttl);
      expect(execMock).toHaveBeenCalledTimes(1);
    });

    it('should create a new cooldown with no ttl and given bbox area', async () => {
      vi.spyOn(Date, 'now').mockImplementation(() => NOW_MOCK);
      executeIsolatedMock.mockImplementation(async (fn: (client: RedisClient) => Promise<unknown>) => fn(mockedRedis));
      multiMock.mockReturnValue(mockedRedis);

      const newCooldownRequest: CooldownCreationRequest = { enabled: true, duration: 100, kits: ['a'], minZoom: 0, maxZoom: 1, area: [1, 2, 3, 4] };
      const { area, ...restOfParams } = newCooldownRequest;
      const expectedToBeHashed = { ...restOfParams, geoshape: 'POLYGON ((1 4, 1 2, 3 2, 3 4, 1 4))' };
      const expected: Cooldown = { ...expectedToBeHashed, createdAt: NOW_MOCK, updatedAt: NOW_MOCK };
      const expectedKey = `${COOLDOWN_KEY_PREFIX}:${hashValue(expectedToBeHashed)}`;

      await cooldownManager.createCooldown(newCooldownRequest);

      expect(executeIsolatedMock).toHaveBeenCalledTimes(1);
      expect(multiMock).toHaveBeenCalledTimes(1);
      expect(setMock).toHaveBeenCalledTimes(1);
      expect(setMock).toHaveBeenCalledWith(expectedKey, '$', expected);
      expect(expireMock).not.toHaveBeenCalled();
      expect(execMock).toHaveBeenCalledTimes(1);
    });

    it('should create a new cooldown with no ttl and given geojson area', async () => {
      vi.spyOn(Date, 'now').mockImplementation(() => NOW_MOCK);
      executeIsolatedMock.mockImplementation(async (fn: (client: RedisClient) => Promise<unknown>) => fn(mockedRedis));
      multiMock.mockReturnValue(mockedRedis);

      const newCooldownRequest: CooldownCreationRequest = {
        enabled: true,
        duration: 100,
        kits: ['a'],
        minZoom: 0,
        maxZoom: 1,
        area: {
          type: 'Polygon',
          coordinates: [
            [
              [1, 4],
              [1, 2],
              [3, 2],
              [3, 4],
              [1, 4],
            ],
          ],
        },
      };
      const { area, ...restOfParams } = newCooldownRequest;
      const expectedToBeHashed = { ...restOfParams, geoshape: 'POLYGON ((1 4, 1 2, 3 2, 3 4, 1 4))' };
      const expected: Cooldown = { ...expectedToBeHashed, createdAt: NOW_MOCK, updatedAt: NOW_MOCK };
      const expectedKey = `${COOLDOWN_KEY_PREFIX}:${hashValue(expectedToBeHashed)}`;

      await cooldownManager.createCooldown(newCooldownRequest);

      expect(executeIsolatedMock).toHaveBeenCalledTimes(1);
      expect(multiMock).toHaveBeenCalledTimes(1);
      expect(setMock).toHaveBeenCalledTimes(1);
      expect(setMock).toHaveBeenCalledWith(expectedKey, '$', expected);
      expect(expireMock).not.toHaveBeenCalled();
      expect(execMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('with a configured redis key prefix', () => {
    const prefix = 'env1:';
    const prefixedConfigMock: IConfig = { get: () => ({ keyPrefix: prefix }), has: () => true };
    let prefixedCooldownManager: CooldownManager;

    beforeAll(async () => {
      prefixedCooldownManager = new CooldownManager(await jsLogger({ enabled: false }), mockedRedis, prefixedConfigMock);
    });

    it('should prefix the cooldown index name and key', async () => {
      vi.spyOn(Date, 'now').mockImplementation(() => NOW_MOCK);
      executeIsolatedMock.mockImplementation(async (fn: (client: RedisClient) => Promise<unknown>) => fn(mockedRedis));
      multiMock.mockReturnValue(mockedRedis);
      searchMock.mockResolvedValue({ documents: [], total: 0 });

      const newCooldownRequest: CooldownCreationRequest = { enabled: true, duration: 100, kits: ['a'], minZoom: 0, maxZoom: 1 };
      const expectedToBeHashed = { ...newCooldownRequest, geoshape: bboxToWktPolygon(HALF_GLOBE_BBOX) };
      const expectedKey = `${prefix}${COOLDOWN_KEY_PREFIX}:${hashValue(expectedToBeHashed)}`;

      await prefixedCooldownManager.createCooldown(newCooldownRequest);
      await prefixedCooldownManager.queryCooldowns({ from: 0, size: 2 });

      expect(setMock).toHaveBeenCalledWith(expectedKey, '$', expect.objectContaining({}));
      expect(searchMock).toHaveBeenCalledWith(`${prefix}${REDIS_COOLDOWN_INDEX_NAME}`, REDIS_WILDCARD, {
        DIALECT: REDIS_SEARCH_DIALECT,
        LIMIT: { from: 0, size: 2 },
      });
    });
  });
});

import { beforeAll, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import type { KitMetadata } from '@map-colonies/detiler-common';
import { jsLogger } from '@map-colonies/js-logger';
import { createClient } from 'redis';
import { REDIS_KITS_HASH_PREFIX, REDIS_KITS_SET } from '../../../../src/common/constants';
import { KitAlreadyExistsError } from '../../../../src/kit/models/errors';
import type { Kit } from '../../../../src/kit/models/kit';
import { KitManager, UPDATE_MAX_VALUES_SCRIPT } from '../../../../src/kit/models/kitManager';

const keyPrefix = '';

vi.mock('redis', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createClient: vi.fn().mockImplementation(() => ({
    hGet: vi.fn(),
    hGetAll: vi.fn(),
    hSet: vi.fn(),
    sMembers: vi.fn(),
    sAdd: vi.fn(),
    eval: vi.fn(),
  })),
}));

type RedisClient = ReturnType<typeof createClient>;

describe('KitManager', () => {
  let kitManager: KitManager;
  let mockedRedis: Mocked<RedisClient>;

  beforeAll(async () => {
    mockedRedis = createClient({}) as Mocked<RedisClient>;
    kitManager = new KitManager(await jsLogger({ enabled: false }), mockedRedis, keyPrefix);
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('#getAllKits', () => {
    it('should get all existing kits', async () => {
      const expectedKeys = ['kit1', 'kit2'];
      const expected: KitMetadata[] = [{ name: 'kit1' }, { name: 'kit2' }];
      mockedRedis.sMembers.mockResolvedValue(expectedKeys);
      mockedRedis.hGetAll.mockResolvedValueOnce(expected[0]).mockResolvedValueOnce(expected[1]);

      const response = await kitManager.getAllKits();

      expect(response).toMatchObject(expected);
      expect(mockedRedis.sMembers).toHaveBeenCalledTimes(1);
      expect(mockedRedis.sMembers).toHaveBeenCalledWith(REDIS_KITS_SET);
      expect(mockedRedis.hGetAll).toHaveBeenCalledTimes(expectedKeys.length);
      expect(mockedRedis.hGetAll).toHaveBeenNthCalledWith(1, `${REDIS_KITS_HASH_PREFIX}:${expectedKeys[0]}`);
      expect(mockedRedis.hGetAll).toHaveBeenNthCalledWith(2, `${REDIS_KITS_HASH_PREFIX}:${expectedKeys[1]}`);
    });
  });

  describe('#createKit', () => {
    it('should create the kit if it does not exist', async () => {
      const newKit: Kit = { name: 'kit3' };
      mockedRedis.hGet.mockResolvedValue(null);

      await kitManager.createKit(newKit);

      expect(mockedRedis.hGet).toHaveBeenCalledTimes(1);
      expect(mockedRedis.hGet).toHaveBeenCalledWith(`${REDIS_KITS_HASH_PREFIX}:${newKit.name}`, 'name');
      expect(mockedRedis.sAdd).toHaveBeenCalledTimes(1);
      expect(mockedRedis.sAdd).toHaveBeenCalledWith(REDIS_KITS_SET, newKit.name);
      expect(mockedRedis.hSet).toHaveBeenCalledTimes(1);
      expect(mockedRedis.hSet).toHaveBeenCalledWith(`${REDIS_KITS_HASH_PREFIX}:${newKit.name}`, { ...newKit, maxUpdatedAt: 0, maxState: 0 });
    });

    it('should reject with KitAlreadyExistsError if kit with the same name if found', async () => {
      const existingKits: KitMetadata[] = [{ name: 'kit1' }, { name: 'kit2' }];
      const newKit: Kit = { name: 'kit2' };
      const expected = new KitAlreadyExistsError(`kit named ${newKit.name} already exists`);
      mockedRedis.hGet.mockResolvedValue(existingKits);

      await expect(kitManager.createKit(newKit)).rejects.toThrow(expected);

      expect(mockedRedis.hGet).toHaveBeenCalledTimes(1);
      expect(mockedRedis.hGet).toHaveBeenCalledWith(`${REDIS_KITS_HASH_PREFIX}:${newKit.name}`, 'name');
      expect(mockedRedis.hSet).toHaveBeenCalledTimes(0);
    });
  });

  describe('#updateMaxValues', () => {
    it('should atomically evaluate the max-update script against the kit hash key', async () => {
      const kitName = 'kit1';
      const state = 666;
      const updatedAt = 1711907506;

      await kitManager.updateMaxValues(kitName, state, updatedAt);

      expect(mockedRedis.eval).toHaveBeenCalledTimes(1);
      expect(mockedRedis.eval).toHaveBeenCalledWith(UPDATE_MAX_VALUES_SCRIPT, {
        keys: [`${REDIS_KITS_HASH_PREFIX}:${kitName}`],
        arguments: [state.toString(), updatedAt.toString()],
      });
    });
  });

  describe('with a configured redis key prefix', () => {
    const prefix = 'env1:';
    let prefixedKitManager: KitManager;

    beforeAll(async () => {
      prefixedKitManager = new KitManager(await jsLogger({ enabled: false }), mockedRedis, prefix);
    });

    it('should prefix the kits set and kit hash keys', async () => {
      const newKit: Kit = { name: 'kit1' };
      mockedRedis.hGet.mockResolvedValue(null);

      await prefixedKitManager.createKit(newKit);

      expect(mockedRedis.hGet).toHaveBeenCalledWith(`${prefix}${REDIS_KITS_HASH_PREFIX}:${newKit.name}`, 'name');
      expect(mockedRedis.sAdd).toHaveBeenCalledWith(`${prefix}${REDIS_KITS_SET}`, newKit.name);
      expect(mockedRedis.hSet).toHaveBeenCalledWith(`${prefix}${REDIS_KITS_HASH_PREFIX}:${newKit.name}`, {
        ...newKit,
        maxUpdatedAt: 0,
        maxState: 0,
      });
    });
  });
});

import { KitMetadata } from '@map-colonies/detiler-common';
import jsLogger from '@map-colonies/js-logger';
import { createClient } from 'redis';
import { REDIS_KITS_HASH_PREFIX } from '../../../../src/common/constants';
import { KitAlreadyExistsError } from '../../../../src/kit/models/errors';
import { Kit } from '../../../../src/kit/models/kit';
import { KitManager } from '../../../../src/kit/models/kitManager';

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
jest.mock('redis', () => ({
  ...jest.requireActual('redis'),
  createClient: jest.fn().mockImplementation(() => ({
    keys: jest.fn(),
    hGet: jest.fn(),
    hGetAll: jest.fn(),
    hSet: jest.fn(),
  })),
}));

type RedisClient = ReturnType<typeof createClient>;

describe('KitManager', () => {
  let kitManager: KitManager;
  let mockedRedis: jest.Mocked<RedisClient>;

  beforeAll(() => {
    mockedRedis = createClient({}) as jest.Mocked<RedisClient>;
    kitManager = new KitManager(jsLogger({ enabled: false }), mockedRedis);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('#getAllKits', () => {
    it('should get all existing kits', async () => {
      const expectedKeys = [`${REDIS_KITS_HASH_PREFIX}:kit1`, `${REDIS_KITS_HASH_PREFIX}:kit2`];
      const expected: KitMetadata[] = [{ name: 'kit1' }, { name: 'kit2' }];
      mockedRedis.keys.mockResolvedValue(expectedKeys);
      mockedRedis.hGetAll.mockResolvedValueOnce(expected[0]).mockResolvedValueOnce(expected[1]);

      const response = await kitManager.getAllKits();

      expect(response).toMatchObject(expected);
      expect(mockedRedis.keys).toHaveBeenCalledTimes(1);
      expect(mockedRedis.keys).toHaveBeenCalledWith(`${REDIS_KITS_HASH_PREFIX}:*`);
      expect(mockedRedis.hGetAll).toHaveBeenCalledTimes(expectedKeys.length);
      expect(mockedRedis.hGetAll).toHaveBeenNthCalledWith(1, expectedKeys[0]);
      expect(mockedRedis.hGetAll).toHaveBeenNthCalledWith(2, expectedKeys[1]);
    });
  });

  describe('#createKit', () => {
    it('should create the kit if it does not exist', async () => {
      const newKit: Kit = { name: 'kit3' };
      mockedRedis.hGet.mockResolvedValue(null);

      await kitManager.createKit(newKit);

      expect(mockedRedis.hGet).toHaveBeenCalledTimes(1);
      expect(mockedRedis.hGet).toHaveBeenCalledWith(`${REDIS_KITS_HASH_PREFIX}:${newKit.name}`, 'name');
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
});

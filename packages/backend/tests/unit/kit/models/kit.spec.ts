import jsLogger from '@map-colonies/js-logger';
import { createClient } from 'redis';
import { REDIS_KITS_SET_KEY } from '../../../../src/common/constants';
import { KitAlreadyExistsError } from '../../../../src/kit/models/errors';
import { Kit } from '../../../../src/kit/models/kit';
import { KitManager } from '../../../../src/kit/models/kitManager';

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
jest.mock('redis', () => ({
  ...jest.requireActual('redis'),
  createClient: jest.fn().mockImplementation(() => ({
    sMembers: jest.fn(),
    sAdd: jest.fn(),
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
      const expected: Kit[] = [{ name: 'kit1' }, { name: 'kit2' }];
      mockedRedis.sMembers.mockResolvedValue(expected);
      const response = await kitManager.getAllKits();

      expect(response).toMatchObject(expected);
      expect(mockedRedis.sMembers).toHaveBeenCalledTimes(1);
      expect(mockedRedis.sMembers).toHaveBeenCalledWith(REDIS_KITS_SET_KEY);
    });
  });

  describe('#createKit', () => {
    it('should create the kit if it does not exist', async () => {
      const existingKits: string[] = ['kit1', 'kit2'];
      const newKit: Kit = { name: 'kit3' };
      mockedRedis.sMembers.mockResolvedValue(existingKits);

      await kitManager.createKit(newKit);

      expect(mockedRedis.sMembers).toHaveBeenCalledTimes(1);
      expect(mockedRedis.sMembers).toHaveBeenCalledWith(REDIS_KITS_SET_KEY);
      expect(mockedRedis.sAdd).toHaveBeenCalledTimes(1);
      expect(mockedRedis.sAdd).toHaveBeenCalledWith(REDIS_KITS_SET_KEY, newKit.name);
    });

    it('should reject with KitAlreadyExistsError if kit with the same name if found', async () => {
      const existingKits: string[] = ['kit1', 'kit2'];
      const newKit: Kit = { name: 'kit2' };
      const expected = new KitAlreadyExistsError(`kit named ${newKit.name} already exists`);
      mockedRedis.sMembers.mockResolvedValue(existingKits);

      await expect(kitManager.createKit(newKit)).rejects.toThrow(expected);

      expect(mockedRedis.sMembers).toHaveBeenCalledTimes(1);
      expect(mockedRedis.sMembers).toHaveBeenCalledWith(REDIS_KITS_SET_KEY);
      expect(mockedRedis.sAdd).toHaveBeenCalledTimes(0);
    });
  });
});

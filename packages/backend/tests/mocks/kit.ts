import { RedisClient } from '../../src/redis';

const hGet = jest.fn();
const hGetAll = jest.fn();
const hSet = jest.fn();
const sMembers = jest.fn();
const sAdd = jest.fn();

const mockRedisClient = {
  hGet,
  hGetAll,
  hSet,
  sMembers,
  sAdd,
} as unknown as jest.Mocked<RedisClient>;

const createClient = jest.fn().mockReturnValue(mockRedisClient);

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
jest.mock('redis', () => ({
  ...jest.requireActual('redis'),
  createClient,
}));

export default {
  createClient,
  mockRedisClient,
  hGet,
  hGetAll,
  hSet,
  sMembers,
  sAdd,
};

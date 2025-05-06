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
};

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

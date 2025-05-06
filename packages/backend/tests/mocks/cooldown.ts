// const hGet = jest.fn();
// const hGetAll = jest.fn();
// const hSet = jest.fn();
// const sMembers = jest.fn();
// const sAdd = jest.fn();

// const mockRedisClient = {
//   hGet,
//   hGetAll,
//   hSet,
//   sMembers,
//   sAdd,
// };

// const createClient = jest.fn().mockReturnValue(mockRedisClient);

// // eslint-disable-next-line @typescript-eslint/no-unsafe-return
// jest.mock('redis', () => ({
//   ...jest.requireActual('redis'),
//   createClient,
// }));

// export default {
//   createClient,
//   mockRedisClient,
//   hGet,
//   hGetAll,
//   hSet,
//   sMembers,
//   sAdd,
// };

const executeIsolatedMock = jest.fn();
const multiMock = jest.fn();
const expireMock = jest.fn();
const execMock = jest.fn();
const searchMock = jest.fn();
const setMock = jest.fn();

const mockRedisClient = {
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
  executeIsolatedMock,
  multiMock,
  expireMock,
  execMock,
  searchMock,
  setMock,
};

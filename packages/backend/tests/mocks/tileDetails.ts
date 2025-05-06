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

const mockRedisClient = {
  hGet: hGetMock,
  executeIsolated: executeIsolatedMock,
  watch: watchMock,
  exists: existsMock,
  multi: multiMock,
  exec: execMock,
  json: {
    mGet: mGetMock,
    set: setMock,
    mSet: mSetMock,
    numIncrBy: numIncrByMock,
    arrAppend: arrAppendMock,
  },
  ft: {
    search: searchMock,
    aggregateWithCursor: aggregateWithCursorMock,
    cursorRead: cursorReadMock,
  },
};

const createClient = jest.fn().mockReturnValue(mockRedisClient);

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
jest.mock('redis', () => ({
  ...jest.requireActual('redis'),
  ...jest.requireActual('@redis/client/dist/lib/errors'),
  createClient,
}));

export default {
  createClient,
  mockRedisClient,
  mGetMock,
  searchMock,
  hGetMock,
  mSetMock,
  setMock,
  numIncrByMock,
  arrAppendMock,
  executeIsolatedMock,
  watchMock,
  existsMock,
  multiMock,
  execMock,
  aggregateWithCursorMock,
  cursorReadMock,
};

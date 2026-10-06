import { beforeEach, describe, expect, it, vi } from 'vitest';
import { jsLogger } from '@map-colonies/js-logger';
import { ErrorReply } from 'redis';
import { COOLDOWN_KEY_PREFIX, REDIS_COOLDOWN_INDEX_NAME, REDIS_TILE_INDEX_NAME, TILE_DETAILS_KEY_PREFIX } from '../../../src/common/constants';
import type { RedisClient } from '../../../src/redis';
import { ensureSearchIndices } from '../../../src/redis/indices';

const createMock = vi.fn();
const redisMock = { ft: { create: createMock } } as unknown as RedisClient;

describe('ensureSearchIndices', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should create both indices unprefixed when no key prefix is configured', async () => {
    createMock.mockResolvedValue('OK');

    await ensureSearchIndices(redisMock, await jsLogger({ enabled: false }), '');

    expect(createMock).toHaveBeenCalledTimes(2);
    /* eslint-disable @typescript-eslint/naming-convention */ // node-redis does not follow eslint naming convention
    expect(createMock).toHaveBeenNthCalledWith(1, REDIS_TILE_INDEX_NAME, expect.any(Object), { ON: 'JSON', PREFIX: `${TILE_DETAILS_KEY_PREFIX}:` });
    expect(createMock).toHaveBeenNthCalledWith(2, REDIS_COOLDOWN_INDEX_NAME, expect.any(Object), { ON: 'JSON', PREFIX: `${COOLDOWN_KEY_PREFIX}:` });
    /* eslint-enable @typescript-eslint/naming-convention */
  });

  it('should prefix both index names and their key prefixes when a key prefix is configured', async () => {
    createMock.mockResolvedValue('OK');
    const prefix = 'env1:';

    await ensureSearchIndices(redisMock, await jsLogger({ enabled: false }), prefix);

    /* eslint-disable @typescript-eslint/naming-convention */ // node-redis does not follow eslint naming convention
    expect(createMock).toHaveBeenNthCalledWith(1, `${prefix}${REDIS_TILE_INDEX_NAME}`, expect.any(Object), {
      ON: 'JSON',
      PREFIX: `${prefix}${TILE_DETAILS_KEY_PREFIX}:`,
    });
    expect(createMock).toHaveBeenNthCalledWith(2, `${prefix}${REDIS_COOLDOWN_INDEX_NAME}`, expect.any(Object), {
      ON: 'JSON',
      PREFIX: `${prefix}${COOLDOWN_KEY_PREFIX}:`,
    });
    /* eslint-enable @typescript-eslint/naming-convention */
  });

  it('should silently skip creation when an index already exists', async () => {
    createMock.mockRejectedValue(new ErrorReply('Index already exists'));

    await expect(ensureSearchIndices(redisMock, await jsLogger({ enabled: false }), '')).resolves.toBeUndefined();
  });

  it('should rethrow errors other than "Index already exists"', async () => {
    const error = new ErrorReply('ERR unknown command FT.CREATE');
    createMock.mockRejectedValueOnce(error);

    await expect(ensureSearchIndices(redisMock, await jsLogger({ enabled: false }), '')).rejects.toThrow(error);
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});

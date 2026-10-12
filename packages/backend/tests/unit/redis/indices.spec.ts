import { beforeEach, describe, expect, it, vi } from 'vitest';
import { jsLogger } from '@map-colonies/js-logger';
import { ErrorReply } from 'redis';
import { COOLDOWN_KEY_PREFIX, REDIS_COOLDOWN_INDEX_NAME, REDIS_TILE_INDEX_NAME, TILE_DETAILS_KEY_PREFIX } from '../../../src/common/constants';
import type { RedisClient } from '../../../src/redis';
import { ensureSearchIndices } from '../../../src/redis/indices';

const sendCommandMock = vi.fn();
const redisMock = { sendCommand: sendCommandMock } as unknown as RedisClient;

describe('ensureSearchIndices', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should create both indices unprefixed when no key prefix is configured', async () => {
    sendCommandMock.mockResolvedValue('OK');

    await ensureSearchIndices(redisMock, await jsLogger({ enabled: false }), '');

    expect(sendCommandMock).toHaveBeenCalledTimes(2);

    const [tileArgs] = sendCommandMock.mock.calls[0] as [string[]];
    const [cooldownArgs] = sendCommandMock.mock.calls[1] as [string[]];

    expect(tileArgs.slice(0, 7)).toEqual(['FT.CREATE', REDIS_TILE_INDEX_NAME, 'ON', 'JSON', 'PREFIX', '1', `${TILE_DETAILS_KEY_PREFIX}:`]);
    // RediSearch 2.8.13 (redis-stack-server:7.2.0-v10) rejects the newer `GEOSHAPE COORD_SYSTEM SPHERICAL` form
    // emitted by node-redis's ft.create() schema builder — assert the raw, positional form is used instead.
    expect(tileArgs).toEqual(expect.arrayContaining(['$.geoshape', 'AS', 'geoshape', 'GEOSHAPE', 'SPHERICAL']));
    expect(tileArgs).not.toContain('COORD_SYSTEM');

    expect(cooldownArgs.slice(0, 7)).toEqual(['FT.CREATE', REDIS_COOLDOWN_INDEX_NAME, 'ON', 'JSON', 'PREFIX', '1', `${COOLDOWN_KEY_PREFIX}:`]);
    expect(cooldownArgs).toEqual(expect.arrayContaining(['$.geoshape', 'AS', 'geoshape', 'GEOSHAPE', 'SPHERICAL']));
    expect(cooldownArgs).not.toContain('COORD_SYSTEM');
  });

  it('should prefix both index names and their key prefixes when a key prefix is configured', async () => {
    sendCommandMock.mockResolvedValue('OK');
    const prefix = 'env1:';

    await ensureSearchIndices(redisMock, await jsLogger({ enabled: false }), prefix);

    const [tileArgs] = sendCommandMock.mock.calls[0] as [string[]];
    const [cooldownArgs] = sendCommandMock.mock.calls[1] as [string[]];

    expect(tileArgs.slice(0, 7)).toEqual([
      'FT.CREATE',
      `${prefix}${REDIS_TILE_INDEX_NAME}`,
      'ON',
      'JSON',
      'PREFIX',
      '1',
      `${prefix}${TILE_DETAILS_KEY_PREFIX}:`,
    ]);
    expect(cooldownArgs.slice(0, 7)).toEqual([
      'FT.CREATE',
      `${prefix}${REDIS_COOLDOWN_INDEX_NAME}`,
      'ON',
      'JSON',
      'PREFIX',
      '1',
      `${prefix}${COOLDOWN_KEY_PREFIX}:`,
    ]);
  });

  it('should silently skip creation when an index already exists', async () => {
    sendCommandMock.mockRejectedValue(new ErrorReply('Index already exists'));

    await expect(ensureSearchIndices(redisMock, await jsLogger({ enabled: false }), '')).resolves.toBeUndefined();
  });

  it('should rethrow errors other than "Index already exists"', async () => {
    const error = new ErrorReply('ERR unknown command FT.CREATE');
    sendCommandMock.mockRejectedValueOnce(error);

    await expect(ensureSearchIndices(redisMock, await jsLogger({ enabled: false }), '')).rejects.toThrow(error);
    expect(sendCommandMock).toHaveBeenCalledTimes(1);
  });
});

import type { ILogger } from '@map-colonies/detiler-common';
import { ErrorReply } from 'redis';
import { COOLDOWN_KEY_PREFIX, TILE_DETAILS_KEY_PREFIX } from '../common/constants';
import { cooldownIndexName, tileIndexName } from '../common/util';
import type { RedisClient } from './index';

const INDEX_ALREADY_EXISTS_ERROR = 'Index already exists';

// node-redis's structured ft.create()/RediSearchSchema builder emits `GEOSHAPE COORD_SYSTEM SPHERICAL` for a
// GEOSHAPE field's coordinate system, which RediSearch 2.8.13 (bundled in redis/redis-stack-server:7.2.0-v10 —
// see CLAUDE.md "Local Redis requirement") rejects with "Invalid field type for field `COORD_SYSTEM`": that
// version only understands the older positional `GEOSHAPE SPHERICAL` form, no COORD_SYSTEM keyword. Build the
// raw FT.CREATE command instead of going through the schema builder, to match exactly what's documented in the
// README (and verified directly against that server) as working.
const tileDetailsCreateArgs = (indexName: string, prefix: string): string[] => [
  'FT.CREATE',
  indexName,
  'ON',
  'JSON',
  'PREFIX',
  '1',
  prefix,
  'SCHEMA',
  '$.kit',
  'AS',
  'kit',
  'TEXT',
  '$.updatedAt',
  'AS',
  'updatedAt',
  'NUMERIC',
  '$.renderedAt',
  'AS',
  'renderedAt',
  'NUMERIC',
  '$.createdAt',
  'AS',
  'createdAt',
  'NUMERIC',
  '$.geoshape',
  'AS',
  'geoshape',
  'GEOSHAPE',
  'SPHERICAL',
  '$.state',
  'AS',
  'state',
  'NUMERIC',
  '$.states[*]',
  'AS',
  'states',
  'NUMERIC',
  '$.z',
  'AS',
  'z',
  'NUMERIC',
  '$.x',
  'AS',
  'x',
  'NUMERIC',
  '$.y',
  'AS',
  'y',
  'NUMERIC',
];

const cooldownCreateArgs = (indexName: string, prefix: string): string[] => [
  'FT.CREATE',
  indexName,
  'ON',
  'JSON',
  'PREFIX',
  '1',
  prefix,
  'SCHEMA',
  '$.kits[*]',
  'AS',
  'kits',
  'TAG',
  '$.minZoom',
  'AS',
  'minZoom',
  'NUMERIC',
  '$.maxZoom',
  'AS',
  'maxZoom',
  'NUMERIC',
  '$.enabled',
  'AS',
  'enabled',
  'TAG',
  '$.geoshape',
  'AS',
  'geoshape',
  'GEOSHAPE',
  'SPHERICAL',
];

const createIndexIfNotExists = async (redis: RedisClient, logger: ILogger, indexName: string, createArgs: string[]): Promise<void> => {
  try {
    await redis.sendCommand(createArgs);
    logger.info({ msg: 'created redis search index', indexName });
  } catch (err) {
    if (err instanceof ErrorReply && err.message.includes(INDEX_ALREADY_EXISTS_ERROR)) {
      logger.debug({ msg: 'redis search index already exists, skipping creation', indexName });
      return;
    }
    throw err;
  }
};

export const ensureSearchIndices = async (redis: RedisClient, logger: ILogger, keyPrefix: string): Promise<void> => {
  await createIndexIfNotExists(
    redis,
    logger,
    tileIndexName(keyPrefix),
    tileDetailsCreateArgs(tileIndexName(keyPrefix), `${keyPrefix}${TILE_DETAILS_KEY_PREFIX}:`)
  );
  await createIndexIfNotExists(
    redis,
    logger,
    cooldownIndexName(keyPrefix),
    cooldownCreateArgs(cooldownIndexName(keyPrefix), `${keyPrefix}${COOLDOWN_KEY_PREFIX}:`)
  );
};

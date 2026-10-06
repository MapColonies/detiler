import type { ILogger } from '@map-colonies/detiler-common';
import { ErrorReply } from 'redis';
import { COOLDOWN_KEY_PREFIX, TILE_DETAILS_KEY_PREFIX } from '../common/constants';
import { cooldownIndexName, tileIndexName } from '../common/util';
import type { RedisClient } from './index';

const INDEX_ALREADY_EXISTS_ERROR = 'Index already exists';

// node-redis's structured ft.create()/RediSearchSchema builder emits `GEOSHAPE COORD_SYSTEM SPHERICAL` for a
// GEOSHAPE field's coordinate system, which RediSearch 2.8.13 (bundled in redis/redis-stack-server:7.2.0-v10 —
// see CLAUDE.md "Local Redis requirement") rejects with "Invalid field type for field `COORD_SYSTEM`": that
// version only understands the older positional `GEOSHAPE SPHERICAL` form, no COORD_SYSTEM keyword. So the
// schemas below are sent as raw FT.CREATE commands (via sendCommand) instead of through that schema builder —
// written one field per line, matching the README's FT.CREATE schema verbatim, and split into tokens on use.
const TILE_DETAILS_SCHEMA = `
  $.kit AS kit TEXT
  $.updatedAt AS updatedAt NUMERIC
  $.renderedAt AS renderedAt NUMERIC
  $.createdAt AS createdAt NUMERIC
  $.geoshape AS geoshape GEOSHAPE SPHERICAL
  $.state AS state NUMERIC
  $.states[*] AS states NUMERIC
  $.z AS z NUMERIC
  $.x AS x NUMERIC
  $.y AS y NUMERIC
`;

const COOLDOWN_SCHEMA = `
  $.kits[*] AS kits TAG
  $.minZoom AS minZoom NUMERIC
  $.maxZoom AS maxZoom NUMERIC
  $.enabled AS enabled TAG
  $.geoshape AS geoshape GEOSHAPE SPHERICAL
`;

const createIndexArgs = (indexName: string, prefix: string, schema: string): string[] => [
  'FT.CREATE',
  indexName,
  'ON',
  'JSON',
  'PREFIX',
  '1',
  prefix,
  'SCHEMA',
  ...schema.trim().split(/\s+/),
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
  const tileDetailsIndexName = tileIndexName(keyPrefix);
  await createIndexIfNotExists(
    redis,
    logger,
    tileDetailsIndexName,
    createIndexArgs(tileDetailsIndexName, `${keyPrefix}${TILE_DETAILS_KEY_PREFIX}:`, TILE_DETAILS_SCHEMA)
  );

  const cooldownIdxName = cooldownIndexName(keyPrefix);
  await createIndexIfNotExists(
    redis,
    logger,
    cooldownIdxName,
    createIndexArgs(cooldownIdxName, `${keyPrefix}${COOLDOWN_KEY_PREFIX}:`, COOLDOWN_SCHEMA)
  );
};

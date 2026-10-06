import type { ILogger } from '@map-colonies/detiler-common';
import { ErrorReply, SchemaFieldTypes, type RediSearchSchema } from 'redis';
import { COOLDOWN_KEY_PREFIX, TILE_DETAILS_KEY_PREFIX } from '../common/constants';
import { cooldownIndexName, tileIndexName } from '../common/util';
import type { RedisClient } from './index';

const INDEX_ALREADY_EXISTS_ERROR = 'Index already exists';

/* eslint-disable @typescript-eslint/naming-convention */ // node-redis schema field options (AS, COORD_SYSTEM) do not follow eslint naming convention
const TILE_DETAILS_SCHEMA: RediSearchSchema = {
  '$.kit': { type: SchemaFieldTypes.TEXT, AS: 'kit' },
  '$.updatedAt': { type: SchemaFieldTypes.NUMERIC, AS: 'updatedAt' },
  '$.renderedAt': { type: SchemaFieldTypes.NUMERIC, AS: 'renderedAt' },
  '$.createdAt': { type: SchemaFieldTypes.NUMERIC, AS: 'createdAt' },
  '$.geoshape': { type: SchemaFieldTypes.GEOSHAPE, AS: 'geoshape', COORD_SYSTEM: 'SPHERICAL' },
  '$.state': { type: SchemaFieldTypes.NUMERIC, AS: 'state' },
  '$.states[*]': { type: SchemaFieldTypes.NUMERIC, AS: 'states' },
  '$.z': { type: SchemaFieldTypes.NUMERIC, AS: 'z' },
  '$.x': { type: SchemaFieldTypes.NUMERIC, AS: 'x' },
  '$.y': { type: SchemaFieldTypes.NUMERIC, AS: 'y' },
};

const COOLDOWN_SCHEMA: RediSearchSchema = {
  '$.kits[*]': { type: SchemaFieldTypes.TAG, AS: 'kits' },
  '$.minZoom': { type: SchemaFieldTypes.NUMERIC, AS: 'minZoom' },
  '$.maxZoom': { type: SchemaFieldTypes.NUMERIC, AS: 'maxZoom' },
  '$.enabled': { type: SchemaFieldTypes.TAG, AS: 'enabled' },
  '$.geoshape': { type: SchemaFieldTypes.GEOSHAPE, AS: 'geoshape', COORD_SYSTEM: 'SPHERICAL' },
};
/* eslint-enable @typescript-eslint/naming-convention */

const createIndexIfNotExists = async (
  redis: RedisClient,
  logger: ILogger,
  indexName: string,
  schema: RediSearchSchema,
  prefix: string
): Promise<void> => {
  try {
    /* eslint-disable @typescript-eslint/naming-convention */ // node-redis does not follow eslint naming convention
    await redis.ft.create(indexName, schema, { ON: 'JSON', PREFIX: prefix });
    /* eslint-enable @typescript-eslint/naming-convention */
    logger.info({ msg: 'created redis search index', indexName, prefix });
  } catch (err) {
    if (err instanceof ErrorReply && err.message.includes(INDEX_ALREADY_EXISTS_ERROR)) {
      logger.debug({ msg: 'redis search index already exists, skipping creation', indexName });
      return;
    }
    throw err;
  }
};

export const ensureSearchIndices = async (redis: RedisClient, logger: ILogger, keyPrefix: string): Promise<void> => {
  await createIndexIfNotExists(redis, logger, tileIndexName(keyPrefix), TILE_DETAILS_SCHEMA, `${keyPrefix}${TILE_DETAILS_KEY_PREFIX}:`);
  await createIndexIfNotExists(redis, logger, cooldownIndexName(keyPrefix), COOLDOWN_SCHEMA, `${keyPrefix}${COOLDOWN_KEY_PREFIX}:`);
};

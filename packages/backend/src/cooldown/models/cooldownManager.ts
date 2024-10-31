import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { SearchOptions } from 'redis';
import { BoundingBox } from '@map-colonies/tile-calc';
import { Cooldown, CooldownCreationRequest, CooldownQueryParams } from '@map-colonies/detiler-common';
import isGeojson from '@turf/boolean-valid';
import { Geometry } from 'geojson';
import { geojsonToWKT } from '@terraformer/wkt';
import { bboxToWktPolygon, hashValue } from '../../common/util';
import {
  SERVICES,
  COOLDOWN_KEY_PREFIX,
  REDIS_COOLDOWN_INDEX_NAME,
  SEARCHED_GEOSHAPE_NAME,
  REDIS_SEARCH_DIALECT,
  REDIS_WILDCARD,
} from '../../common/constants';
import { RedisClient } from '../../redis';

@injectable()
export class CooldownManager {
  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger, @inject(SERVICES.REDIS) private readonly redis: RedisClient) {}

  public async queryCooldowns(params: CooldownQueryParams & Required<Pick<CooldownQueryParams, 'from' | 'size'>>): Promise<Cooldown[]> {
    this.logger.info('quering cooldowns', params);

    const { kits, minZoom, maxZoom, area, enabled, from, size } = params;

    const queryParts: string[] = [];

    /* eslint-disable @typescript-eslint/naming-convention */ // node-redis does not follow eslint naming convention
    let options: SearchOptions & Required<Pick<SearchOptions, 'DIALECT'>> = {
      DIALECT: REDIS_SEARCH_DIALECT,
      LIMIT: { from, size },
    };

    if (area) {
      const [west, south, east, north] = area;
      const bbox: BoundingBox = { west: +west, south: +south, east: +east, north: +north };
      queryParts.push(`@geoshape:[CONTAINS $${SEARCHED_GEOSHAPE_NAME}]`);
      options = {
        ...options,
        PARAMS: {
          [SEARCHED_GEOSHAPE_NAME]: bboxToWktPolygon(bbox),
        },
      };
    }
    /* eslint-enable @typescript-eslint/naming-convention */

    if (kits && kits.length > 0) {
      const kitsQuery = kits.map((kit) => `@kits:{${kit}}`).join(' ');
      queryParts.push(kitsQuery);
    }

    if (minZoom !== undefined) {
      queryParts.push(`@minZoom:[-inf ${minZoom}]`);
    }

    if (maxZoom !== undefined) {
      queryParts.push(`@maxZoom:[${maxZoom} inf]`);
    }

    if (enabled !== undefined) {
      queryParts.push(`@enabled:{${enabled}}`);
    }

    const query = queryParts.length !== 0 ? queryParts.join(' ').trim() : REDIS_WILDCARD;

    this.logger.debug({ msg: 'attempting the following search', query, options });

    const result = await this.redis.ft.search(REDIS_COOLDOWN_INDEX_NAME, query, options);

    this.logger.debug({
      msg: 'finished search',
      query,
      options,
      result,
    });

    if (result.total === 0) {
      return [];
    }

    const cooldowns = result.documents.map((document) => document.value[0]);

    return cooldowns as unknown as Cooldown[];
  }

  public async createCooldown(params: CooldownCreationRequest): Promise<void> {
    this.logger.info({ msg: 'creating new cooldown', params });

    const { area, ...restOfParams } = params;

    let cooldown: Partial<Cooldown> = {
      ...restOfParams,
    };

    if (area !== undefined && Array.isArray(area)) {
      const [west, south, east, north] = area;
      const bbox: BoundingBox = { west: +west, south: +south, east: +east, north: +north };

      cooldown.geoshape = bboxToWktPolygon(bbox);
    }

    if (params.area !== undefined && isGeojson(area as Geometry)) {
      cooldown.geoshape = geojsonToWKT(area as Geometry);
    }

    const key = `${COOLDOWN_KEY_PREFIX}:${hashValue(cooldown)}`;

    const now = Date.now();
    cooldown = {
      ...cooldown,
      createdAt: now,
      updatedAt: now,
    };

    this.logger.info({ msg: 'attempting to create cooldown', key, cooldown, area });

    await this.redis.executeIsolated(async (isolatedClient) => {
      const transaction = isolatedClient.multi();

      transaction.json.set(key, '$', { ...cooldown });

      if (cooldown.ttl !== undefined) {
        transaction.expire(key, cooldown.ttl);
      }

      await transaction.exec();
    });
  }
}

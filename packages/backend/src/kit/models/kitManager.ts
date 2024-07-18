import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { KitMetadata } from '@map-colonies/detiler-common';
import { REDIS_KITS_HASH_PREFIX, SERVICES } from '../../common/constants';
import { RedisClient } from '../../redis';
import { KitAlreadyExistsError } from './errors';
import { Kit } from './kit';

@injectable()
export class KitManager {
  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger, @inject(SERVICES.REDIS) private readonly redis: RedisClient) {}

  public async getAllKits(): Promise<KitMetadata[]> {
    this.logger.info('getting all kits');

    const keys = await this.redis.keys(`${REDIS_KITS_HASH_PREFIX}:*`);

    const kits = (await Promise.all(keys.map(async (key) => this.redis.hGetAll(key)))) as KitMetadata[];

    this.logger.debug({ msg: 'fetched kits', count: kits.length, kits });

    return kits;
  }

  public async createKit(kit: Kit): Promise<void> {
    this.logger.info({ msg: 'creating new kit', kit });

    const existingKit = (await this.redis.hGet(`${REDIS_KITS_HASH_PREFIX}:${kit.name}`, 'name')) as string | null;

    if (existingKit !== null) {
      throw new KitAlreadyExistsError(`kit named ${kit.name} already exists`);
    }

    await this.redis.hSet(`${REDIS_KITS_HASH_PREFIX}:${kit.name}`, { ...kit, maxUpdatedAt: 0, maxState: 0 });
  }
}

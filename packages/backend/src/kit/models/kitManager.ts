import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { REDIS_KITS_SET_KEY, SERVICES } from '../../common/constants';
import { RedisClient } from '../../redis';
import { KitAlreadyExistsError } from './errors';
import { Kit } from './kit';

@injectable()
export class KitManager {
  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger, @inject(SERVICES.REDIS) private readonly redis: RedisClient) {}

  public async getAllKits(): Promise<string[]> {
    this.logger.info('getting all kits');

    const kits = await this.redis.sMembers(REDIS_KITS_SET_KEY);

    this.logger.debug({ msg: 'fetched kits', count: kits.length });

    return kits;
  }

  public async createKit(kit: Kit): Promise<void> {
    this.logger.info({ msg: 'creating new kit', kit });

    const kits = await this.redis.sMembers(REDIS_KITS_SET_KEY);

    if (kits.includes(kit.name)) {
      throw new KitAlreadyExistsError(`kit named ${kit.name} already exists`);
    }

    await this.redis.sAdd(REDIS_KITS_SET_KEY, kit.name);
  }
}

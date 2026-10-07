import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { KitMetadata } from '@map-colonies/detiler-common';
import { SERVICES } from '../../common/constants';
import { kitHashKey, kitsSetKey } from '../../common/util';
import { RedisClient } from '../../redis';
import { KitAlreadyExistsError } from './errors';
import { Kit, ExtendedKit } from './kit';

// atomically raises kit:<name>'s maxState/maxUpdatedAt hash fields, never lowering them; replaces the legacy
// RedisGears v1 (Python) script, which cannot run on RedisGears v2 (JS-only) bundled with current Redis Stack images
export const UPDATE_MAX_VALUES_SCRIPT = `
local hashKey = KEYS[1]
local candidateState = tonumber(ARGV[1])
local candidateUpdatedAt = tonumber(ARGV[2])

local currentState = tonumber(redis.call('HGET', hashKey, 'maxState'))
if currentState == nil or candidateState > currentState then
  redis.call('HSET', hashKey, 'maxState', candidateState)
end

local currentUpdatedAt = tonumber(redis.call('HGET', hashKey, 'maxUpdatedAt'))
if currentUpdatedAt == nil or candidateUpdatedAt > currentUpdatedAt then
  redis.call('HSET', hashKey, 'maxUpdatedAt', candidateUpdatedAt)
end
`;

@injectable()
export class KitManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.REDIS) private readonly redis: RedisClient,
    @inject(SERVICES.REDIS_KEY_PREFIX) private readonly keyPrefix: string
  ) {}

  public async getAllKits(): Promise<KitMetadata[]> {
    this.logger.info('getting all kits');

    const kitNames = await this.redis.sMembers(kitsSetKey(this.keyPrefix));

    const kits = (await Promise.all(kitNames.map(async (name) => this.redis.hGetAll(kitHashKey(name, this.keyPrefix))))) as KitMetadata[];

    this.logger.debug({ msg: 'fetched kits', count: kits.length, kits });

    return kits;
  }

  public async createKit(kit: Kit): Promise<void> {
    this.logger.info({ msg: 'creating new kit', kit });

    const existingKit = (await this.redis.hGet(kitHashKey(kit.name, this.keyPrefix), 'name')) as string | null;

    if (existingKit !== null) {
      throw new KitAlreadyExistsError(`kit named ${kit.name} already exists`);
    }

    const extendedKit: ExtendedKit = { ...kit, maxUpdatedAt: 0, maxState: 0 };

    await this.redis.sAdd(kitsSetKey(this.keyPrefix), kit.name);

    await this.redis.hSet(kitHashKey(kit.name, this.keyPrefix), { ...extendedKit });
  }

  public async updateMaxValues(kitName: string, state: number, updatedAt: number): Promise<void> {
    this.logger.debug({ msg: 'updating kit max values if greater', kitName, state, updatedAt });

    await this.redis.eval(UPDATE_MAX_VALUES_SCRIPT, {
      keys: [kitHashKey(kitName, this.keyPrefix)],
      arguments: [state.toString(), updatedAt.toString()],
    });
  }
}

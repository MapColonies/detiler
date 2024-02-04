import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { TileDetails, TileDetailsPayload, TileParams, TileParamsWithKit, UNSPECIFIED_STATE } from '@map-colonies/detiler-common';
import { WatchError } from 'redis';
import { RedisClient } from '../../redis';
import { keyfy, stringifyCoordinates, tileToLonLat, UpsertStatus } from '../../common/util';
import { METATILE_SIZE, SERVICES } from '../../common/constants';
import { TileDetailsNotFoundError } from './errors';

@injectable()
export class TileDetailsManager {
  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger, @inject(SERVICES.REDIS) private readonly redis: RedisClient) {}

  public async getTileDetailsByKit(params: TileParamsWithKit): Promise<TileDetails> {
    this.logger.info({ msg: 'getting tile details by kit', ...params });

    const tileDetails = (await this.redis.json.get(keyfy(params))) as TileDetails | null;

    if (tileDetails === null) {
      this.logger.error({ msg: 'tile details not found', ...params });
      throw new TileDetailsNotFoundError(`kit's ${params.kit} tile ${params.z}/${params.x}/${params.y} details were not found`);
    }

    return tileDetails;
  }

  public async getTilesDetails(tileParams: TileParams, kits: string[]): Promise<[TileDetails | null]> {
    this.logger.info({ msg: 'getting tile details on multiple kits', ...tileParams, kits, kitsCount: kits.length });

    const keys = kits.map((kit) => keyfy({ ...tileParams, kit }));
    const tilesDetails = (await this.redis.json.mGet(keys, '$')).flat() as [TileDetails | null];

    return tilesDetails;
  }

  public async upsertTilesDetails(params: TileParamsWithKit, payload: TileDetailsPayload): Promise<UpsertStatus> {
    this.logger.info({ msg: 'upsterting tile details', params, payload });

    const key = keyfy(params);

    try {
      return await this.redis.executeIsolated(async (isolatedClient) => {
        await isolatedClient.watch(key);

        const keyExistCounter = await isolatedClient.exists(key);

        // init a transaction, if key is changed until exec is invoked WatchError will be thrown
        const transaction = isolatedClient.multi();

        if (keyExistCounter === 1) {
          transaction.json.mSet([
            { key, path: '$.state', value: payload.state ?? UNSPECIFIED_STATE },
            { key, path: '$.updatedAt', value: payload.timestamp },
          ]);

          transaction.json.numIncrBy(key, '$.updateCount', 1);

          await transaction.exec();

          return UpsertStatus.UPDATED;
        }

        const tileCoordiantes = tileToLonLat({ z: params.z, x: params.x, y: params.y, metatile: METATILE_SIZE });

        const initialTileDetails: TileDetails = {
          z: params.z,
          x: params.x,
          y: params.y,
          kit: params.kit,
          state: payload.state ?? UNSPECIFIED_STATE,
          updatedAt: payload.timestamp,
          createdAt: payload.timestamp,
          updateCount: 1,
          location: stringifyCoordinates(tileCoordiantes),
        };

        transaction.json.set(key, '$', { ...initialTileDetails });

        await transaction.exec();

        return UpsertStatus.INSERTED;
      });
    } catch (err) {
      if (err instanceof WatchError) {
        this.logger.error({ msg: 'transaction discarded due to watch error', key, params, payload });
      }
      throw err;
    }
  }
}

import { TileDetails, TileDetailsPayload, TileParams, TileParamsWithKit } from '@map-colonies/detiler-common';
import { Logger } from '@map-colonies/js-logger';
import { RequestHandler } from 'express';
import httpStatus, { StatusCodes } from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../common/constants';
import { HttpError } from '../../common/errors';
import { UpsertStatus } from '../../common/util';
import { TileDetailsNotFoundError } from '../models/errors';
import { TileDetailsManager } from '../models/tileDetailsManager';

type GetTilesDetailsHandler = RequestHandler<TileParams, [TileDetails | null], unknown, { kits: string[] }>;
type GetTileDetailsByKitHandler = RequestHandler<TileParamsWithKit, TileDetails>;
type PutTileDetailsByKitHandler = RequestHandler<TileParamsWithKit, undefined, TileDetailsPayload>;

@injectable()
export class TileDetailController {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(TileDetailsManager) private readonly manager: TileDetailsManager
  ) {}

  public getTilesDetails: GetTilesDetailsHandler = async (req, res, next) => {
    try {
      const tilesDetails = await this.manager.getTilesDetails(req.params, req.query.kits);
      return res.status(httpStatus.OK).json(tilesDetails);
    } catch (error) {
      return next(error);
    }
  };

  public getTileDetailsByKit: GetTileDetailsByKitHandler = async (req, res, next) => {
    try {
      const tileDetails = await this.manager.getTileDetailsByKit(req.params);
      return res.status(httpStatus.OK).json(tileDetails);
    } catch (error) {
      if (error instanceof TileDetailsNotFoundError) {
        (error as HttpError).status = StatusCodes.NOT_FOUND;
      }
      return next(error);
    }
  };

  public putTileDetails: PutTileDetailsByKitHandler = async (req, res, next) => {
    try {
      const status = await this.manager.upsertTilesDetails(req.params, req.body);
      return res.status(status === UpsertStatus.INSERTED ? httpStatus.CREATED : httpStatus.NO_CONTENT).json();
    } catch (error) {
      return next(error);
    }
  };
}

import { TileDetails, TileDetailsPayload, TileQueryParams } from '@map-colonies/detiler-common';
import { Logger } from '@map-colonies/js-logger';
import { BoundingBox, TILEGRID_WEB_MERCATOR, validateTileGridBoundingBox } from '@map-colonies/tile-calc';
import { RequestHandler } from 'express';
import httpStatus, { StatusCodes } from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../common/constants';
import { HttpError } from '../../common/errors';
import { numerifyTileRequestParams, UpsertStatus } from '../../common/util';
import { KitNotFoundError, TileDetailsNotFoundError } from '../models/errors';
import { TileDetailsManager } from '../models/tileDetailsManager';

type GetTilesDetailsHandler = RequestHandler<undefined, TileDetails[], unknown, Required<TileQueryParams>>;
type GetMultiKitsTilesDetailsHandler = RequestHandler<TileRequestParams, TileDetails[], unknown, { kits?: string[] }>;
type GetTileDetailsByKitHandler = RequestHandler<TileRequestParams & { kit: string }, TileDetails>;
type PutTileDetailsByKitHandler = RequestHandler<TileRequestParams & { kit: string }, undefined, TileDetailsPayload>;

export interface TileRequestParams {
  z: string;
  x: string;
  y: string;
}

@injectable()
export class TileDetailController {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(TileDetailsManager) private readonly manager: TileDetailsManager
  ) {}

  public getTilesDetails: GetTilesDetailsHandler = async (req, res, next) => {
    try {
      const {
        bbox: [west, south, east, north],
        minZoom,
        maxZoom,
        from,
        size,
        ...queryParams
      } = req.query;
      const bbox: BoundingBox = { west: +west, south: +south, east: +east, north: +north };
      validateTileGridBoundingBox(bbox, TILEGRID_WEB_MERCATOR);

      const tilesDetails = await this.manager.queryTilesDetails({
        bbox,
        minZoom: +minZoom,
        maxZoom: +minZoom,
        from: +from,
        size: +size,
        ...queryParams,
      });
      return res.status(httpStatus.OK).json(tilesDetails);
    } catch (error) {
      return next(error);
    }
  };

  public getMultiKitsTilesDetails: GetMultiKitsTilesDetailsHandler = async (req, res, next) => {
    try {
      const { kits } = req.query;
      const params = numerifyTileRequestParams(req.params);
      let tilesDetails: TileDetails[];

      if (kits !== undefined && kits.length > 0) {
        tilesDetails = await this.manager.getTilesDetailsByKits({ ...params, kits });
      } else {
        tilesDetails = await this.manager.getTilesDetailsByZXY(params);
      }

      return res.status(httpStatus.OK).json(tilesDetails);
    } catch (error) {
      return next(error);
    }
  };

  public getTileDetailsByKit: GetTileDetailsByKitHandler = async (req, res, next) => {
    try {
      const params = numerifyTileRequestParams(req.params);
      const tileDetails = await this.manager.getTileDetailsByKit(params);
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
      const params = numerifyTileRequestParams(req.params);
      const status = await this.manager.upsertTilesDetails(params, req.body);
      return res.status(status === UpsertStatus.INSERTED ? httpStatus.CREATED : httpStatus.NO_CONTENT).json();
    } catch (error) {
      if (error instanceof KitNotFoundError) {
        (error as HttpError).status = StatusCodes.NOT_FOUND;
      }
      return next(error);
    }
  };
}

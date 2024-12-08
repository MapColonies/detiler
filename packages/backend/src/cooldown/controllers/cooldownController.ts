import { Logger } from '@map-colonies/js-logger';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { BoundingBox, TILEGRID_WEB_MERCATOR, validateTileGridBoundingBox } from '@map-colonies/tile-calc';
import { Cooldown, CooldownCreationRequest, CooldownQueryParams } from '@map-colonies/detiler-common';
import mime from 'mime-types';
import isGeojson from '@turf/boolean-valid';
import { SERVICES } from '../../common/constants';
import { CooldownManager } from '../models/cooldownManager';
import { RequestValidationError } from '../models/errors';
import { DEFAULT_PAGE_SIZE } from '../../redis';

const txtplain = mime.contentType('text/plain') as string;

type GetCooldownsHandler = RequestHandler<undefined, Cooldown[], undefined, CooldownQueryParams>;
type PostCooldownHandler = RequestHandler<undefined, string, CooldownCreationRequest>;

@injectable()
export class CooldownController {
  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger, @inject(CooldownManager) private readonly manager: CooldownManager) {}

  public getCooldowns: GetCooldownsHandler = async (req, res, next) => {
    try {
      const { area, from, size, ...queryParams } = req.query;

      if (area !== undefined && Array.isArray(area)) {
        const [west, south, east, north] = area;
        const bbox: BoundingBox = { west: +west, south: +south, east: +east, north: +north };
        validateTileGridBoundingBox(bbox, TILEGRID_WEB_MERCATOR);
      }

      const params = {
        area,
        from: from !== undefined ? +from : 0,
        size: size !== undefined ? +size : DEFAULT_PAGE_SIZE,
        ...queryParams,
      };

      const cooldowns = await this.manager.queryCooldowns(params);

      return res.status(httpStatus.OK).json(cooldowns);
    } catch (error) {
      return next(error);
    }
  };

  public postCooldown: PostCooldownHandler = async (req, res, next) => {
    try {
      this.validateRequest(req.body);

      await this.manager.createCooldown(req.body);
      return res.status(httpStatus.CREATED).type(txtplain).send(httpStatus.getStatusText(httpStatus.CREATED));
    } catch (error) {
      return next(error);
    }
  };

  private validateRequest(request: CooldownCreationRequest): void {
    const { minZoom, maxZoom, area } = request;

    // validate zooms
    if (minZoom > maxZoom) {
      const error = new RequestValidationError('minZoom must be less than or equal to maxZoom');
      this.logger.error({ msg: 'validation failed', invalidParam: ['minZoom', 'maxZoom'], received: { minZoom, maxZoom }, err: error });
      throw error;
    }

    if (area === undefined) {
      return;
    }

    // validate bbox
    if (Array.isArray(area)) {
      try {
        const [west, south, east, north] = area;
        const bbox: BoundingBox = { west: +west, south: +south, east: +east, north: +north };
        validateTileGridBoundingBox(bbox, TILEGRID_WEB_MERCATOR);
        return;
      } catch (error) {
        this.logger.error({ msg: 'validation failed', invalidParam: 'area', received: area, err: error });
        throw new RequestValidationError((error as Error).message);
      }
    }

    // validate geojson
    if (!isGeojson(area)) {
      const error = new RequestValidationError('area is an invalid geojson');
      this.logger.error({ msg: 'validation failed', invalidParam: 'area', received: area, err: error });
      throw error;
    }
  }
}

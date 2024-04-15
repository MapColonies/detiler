import { Logger } from '@map-colonies/js-logger';
import { RequestHandler } from 'express';
import httpStatus, { StatusCodes } from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import mime from 'mime-types';
import { SERVICES } from '../../common/constants';
import { HttpError } from '../../common/errors';
import { KitAlreadyExistsError } from '../models/errors';
import { Kit } from '../models/kit';
import { KitManager } from '../models/kitManager';

const txtplain = mime.contentType('text/plain') as string;

type GetAllKitsHandler = RequestHandler<undefined, string[]>;
type PostKitHandler = RequestHandler<undefined, string, Kit>;

@injectable()
export class KitController {
  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger, @inject(KitManager) private readonly manager: KitManager) {}

  public getKits: GetAllKitsHandler = async (req, res, next) => {
    try {
      const kits = await this.manager.getAllKits();
      return res.status(httpStatus.OK).json(kits);
    } catch (error) {
      return next(error);
    }
  };

  public postSync: PostKitHandler = async (req, res, next) => {
    try {
      await this.manager.createKit(req.body);
      return res.status(httpStatus.CREATED).type(txtplain).send(httpStatus.getStatusText(httpStatus.CREATED));
    } catch (error) {
      if (error instanceof KitAlreadyExistsError) {
        (error as HttpError).status = StatusCodes.CONFLICT;
      }
      return next(error);
    }
  };
}

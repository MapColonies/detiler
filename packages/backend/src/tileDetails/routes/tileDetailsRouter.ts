import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { TileDetailController } from '../controllers/tileDetailsController';

export const TILE_DETAILS_ROUTER_SYMBOL = Symbol('tileDetailsRouterFactory');

export const tileDetailsRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(TileDetailController);

  router.get('/:z/:x/:y', controller.getTilesDetails);
  router.get('/:kit/:z/:x/:y', controller.getTileDetailsByKit);
  router.put('/:kit/:z/:x/:y', controller.putTileDetails);

  return router;
};

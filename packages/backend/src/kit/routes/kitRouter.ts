import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { KitController } from '../controller/kitController';

export const KIT_ROUTER_SYMBOL = Symbol('kitRouterFactory');

export const kitRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(KitController);

  router.get('/', controller.getKits);
  router.post('/', controller.postSync);

  return router;
};

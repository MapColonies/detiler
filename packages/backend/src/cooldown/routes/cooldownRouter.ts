import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { CooldownController } from '../controllers/cooldownController';

export const COOLDOWN_ROUTER_SYMBOL = Symbol('cooldownRouterFactory');

export const cooldownRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(CooldownController);

  router.get('/', controller.getCooldowns);
  router.post('/', controller.postCooldown);

  return router;
};

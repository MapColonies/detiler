// this import must be called before the first import of tsyringe
import 'reflect-metadata';
import { createServer } from 'http';
import { createTerminus } from '@godaddy/terminus';
import { Logger } from '@map-colonies/js-logger';
import { DependencyContainer } from 'tsyringe';
import { ConfigType } from './common/config';
import { HEALTHCHECK, ON_SIGNAL, SERVICES } from './common/constants';
import { getApp } from './app';

let container: DependencyContainer | undefined;

void getApp()
  .then(([app, container]) => {
    const logger = container.resolve<Logger>(SERVICES.LOGGER);
    const config = container.resolve<ConfigType>(SERVICES.CONFIG);
    const port = config.get('server.port');

    const server = createTerminus(createServer(app), {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      healthChecks: { '/liveness': container.resolve(HEALTHCHECK) },
      onSignal: container.resolve(ON_SIGNAL),
    });

    server.listen(port, () => {
      logger.info(`app started on port ${port}`);
    });
  })
  .catch(async (error: Error) => {
    console.error('😢 - failed initializing the server');
    console.error(error);

    if (container?.isRegistered(ON_SIGNAL) == true) {
      const shutDown: () => Promise<void> = container.resolve(ON_SIGNAL);
      await shutDown();
    }

    process.exit(1);
  });

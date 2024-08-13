import { DetilerClient, DetilerClientConfig } from '@map-colonies/detiler-client';
import { config } from '../config';
import { logger } from '../logger';

const detilerConfig = config.get<DetilerClientConfig>('client');
const client = new DetilerClient({ ...detilerConfig, logger: logger.child({ subComponent: 'detilerClient' }) });

export { client };

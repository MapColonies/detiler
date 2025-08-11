import createPino from 'pino';
import { LoggerOptions } from '@map-colonies/js-logger';
import { config } from '../config';

const loggerConfig = config.get<LoggerOptions>('telemetry.logger');
const logger = createPino({ ...loggerConfig, browser: { asObject: true } });

export { logger };

import pino from 'pino';
import { LoggerOptions } from '@map-colonies/js-logger';
import { config } from '../config';

const loggerConfig = config.get<LoggerOptions>('telemetry.logger');
const logger = pino({ ...loggerConfig, browser: { asObject: true } });

export { logger };

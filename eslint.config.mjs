import tsBaseConfig from '@map-colonies/eslint-config/ts-base';
import jestConfig from '@map-colonies/eslint-config/jest';
import { config } from '@map-colonies/eslint-config/helpers';

export default [
  { ignores: ['**/dist/**', '**/build/**', 'node_modules/**', 'coverage/**', '**/*.d.ts', 'vite.config.ts'] },
  ...config(jestConfig, tsBaseConfig),
];

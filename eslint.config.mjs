import tsBaseConfig from '@map-colonies/eslint-config/ts-base';
import jestConfig from '@map-colonies/eslint-config/jest';
import { config } from '@map-colonies/eslint-config/helpers';

// export default config(jestConfig, tsBaseConfig);

const base = config(jestConfig, tsBaseConfig);

export default [
  ...base,
  {
    ignores: ['**/dist/**', '**/build/**', 'node_modules/**', 'coverage/**'],
  },
];

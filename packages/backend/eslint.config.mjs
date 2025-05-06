import tsBaseConfig from '@map-colonies/eslint-config/ts-base';
import jestConfig from '@map-colonies/eslint-config/jest';
import { config } from '@map-colonies/eslint-config/helpers';

export default [
  {
    languageOptions: {
      parserOptions: {
        project: 'tsconfig.lint.json',
        tsconfigRootDir: new URL('.', import.meta.url),
      },
    },
    ignores: ['**/*.js', 'dist', 'helm', 'coverage', 'reports', '.husky'],
  },
  ...config(jestConfig, tsBaseConfig),
  {
    rules: {
      '@typescript-eslint/no-duplicate-enum-values': 'off',
    },
  },
];

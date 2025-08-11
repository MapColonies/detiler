import tsBase from '@map-colonies/eslint-config/ts-base';
import { config } from '@map-colonies/eslint-config/helpers';

export default [
  { ignores: ['**/*.js', 'dist', 'helm', '**/*.d.ts', 'vite.config.ts', 'node_modules'] },

  ...config(tsBase, {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.lint.json',
      },
    },
  }),
];

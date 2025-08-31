import tsBase from '@map-colonies/eslint-config/ts-base';
import { config } from '@map-colonies/eslint-config/helpers';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url));

export default [
  { ignores: ['**/*.js', 'dist', 'helm', '**/*.d.ts', 'vite.config.ts', 'node_modules'] },

  ...config(tsBase, {
    languageOptions: {
      parserOptions: {
        // project: './tsconfig.lint.json',
        projeconfigRootDt: [path.join(tsconfigRootDir, 'tsconfig.lint.json')],
        tsconfigRootDir,
      },
    },
  }),
];

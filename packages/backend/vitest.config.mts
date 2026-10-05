import path from 'path';
import { defineConfig } from 'vitest/config';
import tsconfig from './tsconfig.json' with { type: 'json' };

// Create an alias object from the paths in tsconfig.json
const pathAlias = Object.fromEntries(
  Object.entries(tsconfig.compilerOptions.paths).map(([key, [value]]) => [
    key.replace('/*', ''),
    path.resolve(import.meta.dirname, value.replace('/*', '')),
  ])
);

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          setupFiles: ['./tests/configurations/vite.setup.ts'],
          include: ['tests/unit/**/*.spec.ts'],
          environment: 'node',
        },
        resolve: {
          alias: pathAlias,
        },
      },
      {
        test: {
          name: 'e2e',
          setupFiles: ['./tests/configurations/vite.setup.ts'],
          include: ['tests/e2e/**/*.e2e.spec.ts'],
          environment: 'node',
          testTimeout: 30000,
        },
        resolve: {
          alias: pathAlias,
        },
      },
    ],
    coverage: {
      enabled: true,
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['**/vendor/**', 'node_modules/**', 'src/common/**', 'src/*.ts', '**/controllers/**', '**/routes/**', '**/redis/**'],
      reportOnFailure: true,
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
    },
  },
});

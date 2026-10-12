import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.spec.ts'],
    environment: 'node',
    coverage: {
      enabled: true,
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['**/vendor/**', 'node_modules/**'],
      reportOnFailure: true,
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});

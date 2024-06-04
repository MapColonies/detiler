import { defineConfig } from 'vite';
import viteReact from '@vitejs/plugin-react';
import viteEslint from 'vite-plugin-eslint';

export default defineConfig({
  root: 'src',
  envPrefix: 'CONFIG',
  envDir: '../config',
  build: {
    outDir: '../dist',
    commonjsOptions: {
      include: ['packages/client', 'packages/common', /node_modules/],
    },
  },
  esbuild: {
    jsxInject: `import React from 'react'`,
  },
  resolve: {
    preserveSymlinks: true,
  },
  plugins: [
    viteReact(),
    viteEslint({
      cache: false,
      include: ['./src/**/*.ts|tsx'],
      exclude: ['/node_modules/'],
    }),
  ],
});

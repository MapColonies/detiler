# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

detiler tracks per-metatile processing metadata (state, timestamps, counters) so that [retiler](https://github.com/MapColonies/retiler) can skip re-rendering tiles whose source data hasn't changed since they were last rendered. Data lives in Redis (RedisJSON + RediSearch). A React/deck.gl frontend visualizes a kit's tiles colored by a chosen metric (state, update count, skip count, currentness, etc.).

Skip-decision flow (implemented in `retiler`, not here): before rendering a tile, retiler calls `getTileDetails` to read `renderedAt`, compares it against the kit's upstream data timestamp (maintained externally by `osm2pgsql`); if `renderedAt` is already newer, it skips rendering and calls `setTileDetails(..., {status: 'skipped'})`, otherwise it renders and calls `setTileDetails(..., {status: 'rendered'})`.

## Monorepo layout

npm workspaces + Lerna, 4 independent packages under `packages/`:

- **backend** (`detiler-backend`) — Express API, the only thing that talks to Redis directly
- **frontend** (`detiler-frontend`) — Vite + React + deck.gl visualizer
- **client** (`@map-colonies/detiler-client`) — axios wrapper around the backend API; this is what `retiler` depends on
- **common** (`@map-colonies/detiler-common`) — shared TypeScript types/constants only, no logic

`backend`/`frontend` depend on the built `dist/` of `client`/`common` — build those first (or just build everything, Lerna resolves the order).

## Commands

Install once at the repo root (`npm install`, workspaces). Then, per package or via Lerna from the root:

```bash
npx lerna run build          # builds all packages in dependency order
npx lerna run test           # runs all unit test suites
npx lerna run lint
```

All of `packages/backend`, `packages/client`, and `packages/common` run their unit tests on vitest (same script names across all three):

```bash
npm run build                # tsc -p tsconfig.build.json, then copies config/openapi3.yaml/package.json into dist
npm run test:unit            # vitest run (backend scopes this to its unit project: `vitest run --project unit`)
npm run lint / lint:fix
npm run format / format:fix
npm start                    # backend only: build, then `node dist/index.js`
```

Run a single test file or test name (works the same in all three packages):

```bash
npx vitest run tests/unit/kit/models/kit.spec.ts
npx vitest run -t "should create the kit"
```

Note: running a narrowed subset will still report a non-zero exit from the coverage thresholds below even when every test passes — check the `Tests` summary line, not the process exit code, when running less than the full suite.

`packages/frontend` has no test suite at all — it has `npm run typecheck` (custom `typecheck.mjs`) and `npm run build` (typecheck + `vite build`); for local dev run `npx vite` directly inside `packages/frontend` (the `start` script is `vite preview`, which only serves an already-built `dist/`, not a dev server).

Integration tests are intentionally absent — see README: blocked on a `node-redis` library issue ([redis/node-redis#2546](https://github.com/redis/node-redis/issues/2546)).

Vitest coverage thresholds (each package's own `vitest.config.mts`, under `test.coverage.thresholds`): 80% branches/functions/lines. `backend`'s config additionally excludes `controllers/`, `routes/`, and `redis/` from coverage accounting.

### Commit messages

Enforced by commitlint via a husky `commit-msg` hook ([commitlint.config.js](commitlint.config.js)): standard conventional-commits rules, **plus** scope is required (`scope-empty: never`) and must be exactly one of `deps | configurations | backend | client | common | frontend` (`scope-enum`). A commit touching only `packages/backend` should be scoped `fix(backend): ...` / `feat(backend): ...`, not left scope-less or multi-scoped.

## Architecture

### Frontend config injection

Env vars are read at Vite buildtime (`envPrefix: 'CONFIG'`, `envDir: '../config'` in `vite.config.ts`, parsed in `src/config/index.ts`). The committed [config/.env.production](packages/frontend/config/.env.production) contains only `*_PLACEHOLDER` values; the production Docker image's [env.sh](packages/frontend/env.sh) `sed`-replaces those placeholders in the built JS at container start. For local development, `npx vite` needs a real `packages/frontend/config/.env.development` with actual values (`CONFIG_DETILER_CLIENT_URL`, etc.) — it is not provided by default.

### Client package

`@map-colonies/detiler-client` (`packages/client/src/client/index.ts`) is a thin axios wrapper (`getKits`, `queryTilesDetails`/`queryTilesDetailsAsyncGenerator` with cursor pagination, `getTileDetails`, `setTileDetails`, `queryCooldownsAsyncGenerator`) with optional `axios-retry` configuration. It talks to the backend's routes directly at the root (`/kits`, `/detail`, `/cooldown` — there's no `/api` prefix; `openapiConfig.basePath` in the backend config is only for the Swagger UI, not the actual API routes).

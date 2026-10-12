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

`packages/backend` additionally has `npm run test:e2e` (`vitest run --project e2e --coverage.enabled=false`), which hits a real running instance instead of mocks — see [tests/e2e/README.md](packages/backend/tests/e2e/README.md). `packages/common` is almost entirely types/constants with no logic, so its suite ([tests/unit/index.spec.ts](packages/common/tests/unit/index.spec.ts)) is a thin smoke test guarding the public constants, not a coverage-driven suite. `packages/frontend` has no test suite at all — it has `npm run typecheck` (custom `typecheck.mjs`) and `npm run build` (typecheck + `vite build`); for local dev run `npx vite` directly inside `packages/frontend` (the `start` script is `vite preview`, which only serves an already-built `dist/`, not a dev server).

Integration tests are intentionally absent — see README: blocked on a `node-redis` library issue ([redis/node-redis#2546](https://github.com/redis/node-redis/issues/2546)).

Vitest coverage thresholds (each package's own `vitest.config.mts`, under `test.coverage.thresholds`): 80% branches/functions/lines. `backend`'s config additionally excludes `controllers/`, `routes/`, and `redis/` from coverage accounting.

### Commit messages

Enforced by commitlint via a husky `commit-msg` hook ([commitlint.config.js](commitlint.config.js)): standard conventional-commits rules, **plus** scope is required (`scope-empty: never`) and must be exactly one of `deps | configurations | backend | client | common | frontend` (`scope-enum`). A commit touching only `packages/backend` should be scoped `fix(backend): ...` / `feat(backend): ...`, not left scope-less or multi-scoped.

## Architecture

### Backend bootstrap

`index.ts` → `getApp()` (`app.ts`) → `registerExternalValues()` (`containerConfig.ts`, tsyringe DI container setup: logger, otel tracer/meter, Redis client, router factories) → `ServerBuilder.build()` (`serverBuilder.ts`, wires Express middleware and mounts routers). Config comes from the `config` npm package: [packages/backend/config/default.json](packages/backend/config/default.json) plus env var overrides declared in [custom-environment-variables.json](packages/backend/config/custom-environment-variables.json). Three route domains, each with its own `controllers/`, `models/`, `routes/`: `tileDetails` (`/detail`), `kit` (`/kits`), `cooldown` (`/cooldown`).

### Tile coordinate system — not standard web-mercator slippy tiles

Tile `z/x/y` throughout this codebase (both in the API and in Redis keys) is **not** the usual OSM/Google XYZ scheme. It's `@map-colonies/tile-calc`'s `TILEGRID_WORLD_CRS84` grid (an equirectangular/plate-carrée OGC grid, 2 tiles wide × 1 tall at zoom 0) combined with `METATILE_SIZE = 8` (a "metatile" groups an 8×8 block of raw tiles into one addressable unit). Valid `x`/`y` ranges at a given zoom are therefore much smaller than Web Mercator intuition suggests: at zoom `z`, `x ∈ [0, 2·2^z/8)` and `y ∈ [0, 1·2^z/8)` (see `validateTile` in `@map-colonies/tile-calc`). Always compute real coordinates with `lonLatZoomToTile({lon, lat}, z, METATILE_SIZE, TILEGRID_WORLD_CRS84)` rather than assuming slippy-map math — the two schemes diverge quickly and fail with `RangeError: x/y index out of range of tile grid`.

### Client package

`@map-colonies/detiler-client` (`packages/client/src/client/index.ts`) is a thin axios wrapper (`getKits`, `queryTilesDetails`/`queryTilesDetailsAsyncGenerator` with cursor pagination, `getTileDetails`, `setTileDetails`, `queryCooldownsAsyncGenerator`) with optional `axios-retry` configuration. It talks to the backend's routes directly at the root (`/kits`, `/detail`, `/cooldown` — there's no `/api` prefix; `openapiConfig.basePath` in the backend config is only for the Swagger UI, not the actual API routes).

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

Within `packages/backend` or `packages/client` (same script names in both):
```bash
npm run build                # tsc -p tsconfig.build.json, then copies config/openapi3.yaml/package.json into dist
npm run test:unit            # jest --config=./tests/configurations/unit/jest.config.js
npm run lint / lint:fix
npm run format / format:fix
npm start                    # backend only: build, then `node dist/index.js`
```

Run a single test file or test name:
```bash
npx jest --config=./tests/configurations/unit/jest.config.js tests/unit/kit/models/kit.spec.ts
npx jest --config=./tests/configurations/unit/jest.config.js -t "should create the kit"
```
Note: running a narrowed subset will still report a non-zero exit from the global coverage thresholds below even when every test passes — check the `Tests:` line, not the process exit code, when running less than the full suite.

`packages/common` defines a `test:unit` script but has no `tests/` directory or jest config at all — it's effectively a no-op (there's nothing to run). `packages/frontend` has no jest suite — it has `npm run typecheck` (custom `typecheck.mjs`) and `npm run build` (typecheck + `vite build`); for local dev run `npx vite` directly inside `packages/frontend` (the `start` script is `vite preview`, which only serves an already-built `dist/`, not a dev server).

Integration tests are intentionally absent — see README: blocked on a `node-redis` library issue ([redis/node-redis#2546](https://github.com/redis/node-redis/issues/2546)).

Jest coverage thresholds (`jest.config.base.js`): 80% branches/functions/lines globally. `backend`'s jest config additionally excludes `controllers/`, `routes/`, and `redis/` from coverage accounting.

### Commit messages

Enforced by commitlint via a husky `commit-msg` hook ([commitlint.config.js](commitlint.config.js)): standard conventional-commits rules, **plus** scope is required (`scope-empty: never`) and must be exactly one of `deps | configurations | helm | backend | client | common | frontend` (`scope-enum`). A commit touching only `packages/backend` should be scoped `fix(backend): ...` / `feat(backend): ...`, not left scope-less or multi-scoped.

## Architecture

### Backend bootstrap

`index.ts` → `getApp()` (`app.ts`) → `registerExternalValues()` (`containerConfig.ts`, tsyringe DI container setup: logger, otel tracer/meter, Redis client, router factories) → `ServerBuilder.build()` (`serverBuilder.ts`, wires Express middleware and mounts routers). Config comes from the `config` npm package: [packages/backend/config/default.json](packages/backend/config/default.json) plus env var overrides declared in [custom-environment-variables.json](packages/backend/config/custom-environment-variables.json). Three route domains, each with its own `controllers/`, `models/`, `routes/`: `tileDetails` (`/detail`), `kit` (`/kits`), `cooldown` (`/cooldown`).

### Tile coordinate system — not standard web-mercator slippy tiles

Tile `z/x/y` throughout this codebase (both in the API and in Redis keys) is **not** the usual OSM/Google XYZ scheme. It's `@map-colonies/tile-calc`'s `TILEGRID_WORLD_CRS84` grid (an equirectangular/plate-carrée OGC grid, 2 tiles wide × 1 tall at zoom 0) combined with `METATILE_SIZE = 8` (a "metatile" groups an 8×8 block of raw tiles into one addressable unit). Valid `x`/`y` ranges at a given zoom are therefore much smaller than Web Mercator intuition suggests: at zoom `z`, `x ∈ [0, 2·2^z/8)` and `y ∈ [0, 1·2^z/8)` (see `validateTile` in `@map-colonies/tile-calc`). Always compute real coordinates with `lonLatZoomToTile({lon, lat}, z, METATILE_SIZE, TILEGRID_WORLD_CRS84)` rather than assuming slippy-map math — the two schemes diverge quickly and fail with `RangeError: x/y index out of range of tile grid`.

### Redis data layout

- `tile:<kit>:<z>/<x>/<y>` — RedisJSON document, one per metatile (`state`, `states[]` history, `createdAt`/`updatedAt`/`renderedAt`, `updateCount`/`renderCount`/`skipCount`/`coolCount`, `geoshape` WKT polygon, `coordinates`). Upserted via a `WATCH`/`MULTI`/`EXEC` optimistic transaction in `TileDetailsManager.upsertTilesDetails`.
- `kit:<name>` — Redis hash: `name`, `maxState`, `maxUpdatedAt` (the running max across all the kit's tiles — see below).
- `kits` — Redis set of all kit names.
- `cooldown:<id>` — RedisJSON documents for temporarily-exempt zoom/area ranges.
- Two RediSearch indices back all querying: `tileDetailsIdx` (prefix `tile:`) and `cooldownIdx` (prefix `cooldown:`) — see README for the exact `FT.CREATE` schemas. All of `GET /detail`, `GET /detail/{z}/{x}/{y}`, and `GET /cooldown` go through `FT.AGGREGATE`/`FT.SEARCH`, including geospatial `GEOSHAPE` queries against the current map viewport.

**Known index gotcha:** `tileDetailsIdx` defines `kit` as RediSearch `TEXT` (tokenized full text), not `TAG` (exact match) — `cooldownIdx`'s equivalent `kits` field is correctly a `TAG`. Because `TileDetailsManager.queryTilesDetails` builds an unquoted query like `@kit:(my-kit)`, a kit name containing a hyphen gets its query silently mis-parsed (RediSearch reads a bare `-` inside a group as a NOT operator), matching zero tiles with no error anywhere. Avoid hyphens in kit names used for testing, or quote/escape the term if you touch that query.

**Kit max-value maintenance:** `kit:<name>`'s `maxState`/`maxUpdatedAt` are kept current by `KitManager.updateMaxValues`, called from `TileDetailsManager.upsertTilesDetails` after every successful tile write. It's a single atomic `EVAL` of a small Lua "raise-if-greater" script — not a separate process. This replaced a legacy RedisGears v1 (Python, `RG.PYEXECUTE`) script that no longer runs on any current Redis Stack image: the bundled RedisGears is now v2, which only supports JavaScript (`TFUNCTION`/`TFCALL`), so `RG.PYEXECUTE` doesn't exist anymore. Don't reintroduce a Gears-based approach for this; keep it in-app.

**Local Redis requirement:** needs RedisJSON ≥ 2.6 (for `JSON.MSET`, used in the tile-update transaction) and RediSearch with `GEOSHAPE` support. Use `redis/redis-stack-server` (the `7.2.0-v10` tag matches what's deployed in the OpenShift dev cluster) — not the old `redislabs/redismod` image, whose frozen RedisJSON 2.0.11 predates `JSON.MSET` and will fail every tile update with `EXECABORT`/`unknown command`.

### Frontend config injection

Env vars are read at Vite buildtime (`envPrefix: 'CONFIG'`, `envDir: '../config'` in `vite.config.ts`, parsed in `src/config/index.ts`). The committed [config/.env.production](packages/frontend/config/.env.production) contains only `*_PLACEHOLDER` values; the production Docker image's [env.sh](packages/frontend/env.sh) `sed`-replaces those placeholders in the built JS at container start. For local development, `npx vite` needs a real `packages/frontend/config/.env.development` with actual values (`CONFIG_DETILER_CLIENT_URL`, etc.) — it is not provided by default.

### Client package

`@map-colonies/detiler-client` (`packages/client/src/client/index.ts`) is a thin axios wrapper (`getKits`, `queryTilesDetails`/`queryTilesDetailsAsyncGenerator` with cursor pagination, `getTileDetails`, `setTileDetails`, `queryCooldownsAsyncGenerator`) with optional `axios-retry` configuration. It talks to the backend's routes directly at the root (`/kits`, `/detail`, `/cooldown` — there's no `/api` prefix; `openapiConfig.basePath` in the backend config is only for the Swagger UI, not the actual API routes).

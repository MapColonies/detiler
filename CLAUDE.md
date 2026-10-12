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

### Redis data layout

- `tile:<kit>:<z>/<x>/<y>` — RedisJSON document, one per metatile (`state`, `states[]` history, `createdAt`/`updatedAt`/`renderedAt`, `updateCount`/`renderCount`/`skipCount`/`coolCount`, `geoshape` WKT polygon, `coordinates`). Upserted via a `WATCH`/`MULTI`/`EXEC` optimistic transaction in `TileDetailsManager.upsertTilesDetails`.
- `kit:<name>` — Redis hash: `name`, `maxState`, `maxUpdatedAt` (the running max across all the kit's tiles — see below).
- `kits` — Redis set of all kit names.
- `cooldown:<id>` — RedisJSON documents for temporarily-exempt zoom/area ranges.
- Two RediSearch indices back all querying: `tileDetailsIdx` (prefix `tile:`) and `cooldownIdx` (prefix `cooldown:`) — see README for the exact `FT.CREATE` schemas; `ensureSearchIndices` (`src/redis/indices.ts`) creates whichever are missing on every startup. All of `GET /detail`, `GET /detail/{z}/{x}/{y}`, and `GET /cooldown` go through `FT.AGGREGATE`/`FT.SEARCH`, including geospatial `GEOSHAPE` queries against the current map viewport.

**Known index gotcha:** `tileDetailsIdx` defines `kit` as RediSearch `TEXT` (tokenized full text), not `TAG` (exact match) — `cooldownIdx`'s equivalent `kits` field is correctly a `TAG`. Because `TileDetailsManager.queryTilesDetails` builds an unquoted query like `@kit:(my-kit)`, a kit name containing a hyphen gets its query silently mis-parsed (RediSearch reads a bare `-` inside a group as a NOT operator), matching zero tiles with no error anywhere. Avoid hyphens in kit names used for testing, or quote/escape the term if you touch that query.

**Kit max-value maintenance:** `kit:<name>`'s `maxState`/`maxUpdatedAt` are kept current by `KitManager.updateMaxValues`, called from `TileDetailsManager.upsertTilesDetails` after every successful tile write. It's a single atomic `EVAL` of a small Lua "raise-if-greater" script — not a separate process. This replaced a legacy RedisGears v1 (Python, `RG.PYEXECUTE`) script that no longer runs on any current Redis Stack image: the bundled RedisGears is now v2, which only supports JavaScript (`TFUNCTION`/`TFCALL`), so `RG.PYEXECUTE` doesn't exist anymore. Don't reintroduce a Gears-based approach for this; keep it in-app.

**Local Redis requirement:** needs RedisJSON ≥ 2.6 (for `JSON.MSET`, used in the tile-update transaction) and RediSearch with `GEOSHAPE` support. Use `redis/redis-stack-server` (the `7.2.0-v10` tag matches what's deployed in the OpenShift dev cluster) — not the old `redislabs/redismod` image, whose frozen RedisJSON 2.0.11 predates `JSON.MSET` and will fail every tile update with `EXECABORT`/`unknown command`.

**Key prefix:** `redis.keyPrefix` (env var `REDIS_KEY_PREFIX`, default `"detiler:"`) is prepended verbatim to every key above and to both RediSearch index names (`<prefix>tileDetailsIdx`, `<prefix>cooldownIdx`), so multiple environments/apps can share one Redis instance without colliding. Threaded through `KitManager`, `TileDetailsManager`, and `CooldownManager` via an injected `SERVICES.CONFIG`, using the helpers in [util.ts](packages/backend/src/common/util.ts) (`keyfy`, `kitHashKey`, `kitsSetKey`, `cooldownKey`, `tileIndexName`, `cooldownIndexName`) — don't reintroduce the old unprefixed inline template literals.

**Automatic index creation:** `ensureSearchIndices` (`src/redis/indices.ts`) runs once at startup, from the `SERVICES.REDIS` `postInjectionHook` in `containerConfig.ts` right after `redis.connect()` — before the server starts listening. It calls `FT.CREATE` for both indices (using the configured `keyPrefix` for the index name and the `PREFIX` clause) and swallows the `Index already exists` `ErrorReply`, so it's a no-op on repeat boots and safe with multiple replicas starting concurrently (one wins the race, the rest get — and ignore — that same error). Any other error (e.g. RediSearch module missing, no `FT.CREATE` permission) aborts startup, same as a Redis connection failure. Don't move this to a lazy per-request check — it must complete before the app accepts traffic, since every query handler assumes the indices already exist.

### Client package

`@map-colonies/detiler-client` (`packages/client/src/client/index.ts`) is a thin axios wrapper (`getKits`, `queryTilesDetails`/`queryTilesDetailsAsyncGenerator` with cursor pagination, `getTileDetails`, `setTileDetails`, `queryCooldownsAsyncGenerator`) with optional `axios-retry` configuration. It talks to the backend's routes directly at the root (`/kits`, `/detail`, `/cooldown` — there's no `/api` prefix; `openapiConfig.basePath` in the backend config is only for the Swagger UI, not the actual API routes).

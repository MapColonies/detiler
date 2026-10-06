# detiler

this monorepo includes detiler backend, frontend, client and their common library

## detiler-backend
deploys an api used to maintain each and every metatile's metadata and query it according to selected filters

data is cached in redis and updated with each tile processing done by the [retiler](https://github.com/MapColonies/retiler) service

- leverages from unnecessary tile processing skip
- quick and easy kit comparison
- data maintenance for immediate and future BI

## detiler-frontend
a react app containing `deck.gl` map components presenting selected kit's metatiles.

data is colored in relation to some metric (state, update count, skip count, currentness, etc.) thus presenting for each tile it's metric in correlation with all other tiles.

### tile metadata example:
```json
{
  "z":17,
  "x":19520,
  "y":5321,
  "kit":"my-default-kit",
  "state":666,
  "states": [...,664,665,666],
  "updatedAt":1711907506,
  "renderedAt":1711907506,
  "createdAt":1711302106,
  "updateCount":13,
  "renderCount":11,
  "skipCount":2,
  "coolCount":0,
  "geoshape":"POLYGON ((34.453125 31.541748046875, 34.453125 31.53076171875, 34.464111328125 31.53076171875, 34.464111328125 31.541748046875, 34.453125 31.541748046875))",
  "coordinates":"34.458618, 31.536255"
}
```

### tile processing skip timeline:
this process will occur in `retiler` by quering `detiler-backend`

1. a tile is being candidate for processing
2. is the tile processing is attributed as forced? if so skip steps 3-5 and jump to step 6.
3. query the tile's details from the backend --and `renderedAt` field
4. fetch the tile's kit data timestamp (the timestamp is being maintained by osm2pgsql, with every append data timestamp is updated)
5. compare the two, if tile's `renderedAt` time is later than kit data time - the tile has already been processed with the most current data, meaning its processing can be skipped. thus we have the following branch, either:
    - `renderedAt` >= kit timestamp - processing should be skipped: update the tile's details - `state`, `updateCount`, `updatedAt` and `skipCount` accordingly
    - `renderedAt` < kit timestamp - processing is needed
6. process the tile and update the tile's details - `state`, `updateCount`, `updatedAt`, `renderCount` and `renderedAt` accordingly

## Configuration
the frontend app including its environment variables are being processed in buildtime.
to achieve runtime variables we inject for each variable it's value in runtime instead of a placeholder.

see [.env.production](/packages/frontend/config/.env.production) and [env.sh](/packages/frontend/env.sh).

## Redis
### key prefix (shared Redis instances):
`detiler-backend` can be configured with `redis.keyPrefix` (env var `REDIS_KEY_PREFIX`, default `""`) to avoid colliding
with other apps, or other `detiler` deployments/environments, that point at the same Redis instance. When set, it is
prepended verbatim (no separator is added — include your own, e.g. `"myenv:"` or `"myenv-"`) to every key
(`tile:...`, `kit:...`, `kits`, `cooldown:...`) **and** to both RediSearch index names (`tileDetailsIdx`,
`cooldownIdx` below become `<prefix>tileDetailsIdx`, `<prefix>cooldownIdx`). Leaving it unset/empty preserves the
exact key and index names below, so existing single-tenant deployments are unaffected.

Each environment that sets a distinct prefix gets its own, separately-named indices, created automatically (see below)
— no manual step needed per environment.

### redis search index creation:
On every startup, `detiler-backend` ensures both RediSearch indices exist, creating whichever are missing — see
`ensureSearchIndices` in [indices.ts](/packages/backend/src/redis/indices.ts). `FT.CREATE` fails with `Index already
exists` if an index is already there, which is caught and ignored, so this is safe to run on every boot (including
with multiple replicas starting concurrently) and requires no manual setup. It's equivalent to running:
```
FT.CREATE <prefix>tileDetailsIdx ON JSON PREFIX 1 <prefix>tile: SCHEMA $.kit AS kit TEXT $.updatedAt AS updatedAt NUMERIC $.renderedAt AS renderedAt NUMERIC $.createdAt AS createdAt NUMERIC $.geoshape AS geoshape GEOSHAPE SPHERICAL $.state AS state NUMERIC $.states[*] AS states NUMERIC $.z AS z NUMERIC $.x AS x NUMERIC $.y AS y NUMERIC

FT.CREATE <prefix>cooldownIdx ON JSON PREFIX 1 <prefix>cooldown: SCHEMA $.kits[*] AS kits TAG $.minZoom AS minZoom NUMERIC $.maxZoom AS maxZoom NUMERIC $.enabled AS enabled TAG $.geoshape AS geoshape GEOSHAPE SPHERICAL
```
(`<prefix>` is literally empty when `REDIS_KEY_PREFIX` is unset.) This requires the Redis user `detiler-backend`
connects as to have `FT.CREATE` permission — if its ACL is read/write-only on data commands, grant it or keep running
these commands manually instead.

### kit metadata maintenance:
each kit's `maxState` and `maxUpdatedAt` (used by the frontend to bound its state-range filter) are maintained directly by `detiler-backend` itself, on every tile upsert — see `KitManager.updateMaxValues` in [kitManager.ts](/packages/backend/src/kit/models/kitManager.ts). it atomically raises those two fields via a Lua script (`EVAL`), so no separate Redis module or out-of-process script is required.

> this used to be implemented as a `Redis Gears` (v1, Python) script registered on `tile:*` writes. it was removed since RedisGears v1's Python engine is not present in current Redis Stack images (bundled RedisGears v2 only supports JavaScript via `TFUNCTION`/`TFCALL`), which made the old script permanently dead code against any current deployment.

## Development
This repository is a monorepo managed by [`Lerna`](https://lerna.js.org/) and separated into multiple independent packages

## Building
```
npx lerna run build
```

## Tests
integration tests are missing due to `node-redis` library structure, [see open issue here](https://github.com/redis/node-redis/issues/2546)
```
npx lerna run test
```


```
nvm use
docker run -d --name detiler-redis -p 6379:6379 redis/redis-stack-server:7.2.0-v10
cd packages/backend && npm run start
cd packages/frontend && npx vite
```

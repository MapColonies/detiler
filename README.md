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
### redis search tile details index creation:
```
FT.CREATE tileDetailsIdx ON JSON PREFIX 1 tile: SCHEMA $.kit AS kit TEXT $.updatedAt AS updatedAt NUMERIC $.renderedAt AS renderedAt NUMERIC $.createdAt AS createdAt NUMERIC $.geoshape AS geoshape GEOSHAPE SPHERICAL $.state AS state NUMERIC $.states[*] AS states NUMERIC $.z AS z NUMERIC $.x AS x NUMERIC $.y AS y NUMERIC
```

### redis search cooldowns index creation:
```
FT.CREATE cooldownIdx ON JSON PREFIX 1 cooldown: SCHEMA $.kits[*] AS kits TAG $.minZoom AS minZoom NUMERIC $.maxZoom AS maxZoom NUMERIC $.enabled AS enabled TAG $.geoshape AS geoshape GEOSHAPE SPHERICAL
```

### redis post processing:
using `Redis Gears` the following post processing function is being used to maintain additional metadata for each kit - it's `maxState` and `maxUpdatedAt` see [maintain_kit_metadata.py](/packages/backend/gears/maintain_kit_metadata.py) for full documented python code

execute with `redis-cli`
```
RG.PYEXECUTE "
def extract_data(record):\n
    data_key = record['key']\n

    kit = execute('JSON.GET', data_key, 'kit')\n
    state = execute('JSON.GET', data_key, 'state')\n
    updated_at = execute('JSON.GET', data_key, 'updatedAt')\n
    return { 'kit': kit[1:-1], 'state': int(state), 'updated_at': int(updated_at) }\n

def update_maximums(data):\n
    kit_key = 'kit:' + data['kit']\n

    max_state = execute('HGET', kit_key, 'maxState')\n
    max_state = int(max_state) if max_state else 0\n
    if data['state'] > max_state:\n
        execute('HSET', kit_key, 'maxState', data['state'])\n

    max_updated_at = execute('HGET', kit_key, 'maxUpdatedAt')\n
    max_updated_at = int(max_updated_at) if max_updated_at else 0\n
    if data['updated_at'] > max_updated_at:\n
        execute('HSET', kit_key, 'maxUpdatedAt', data['updated_at'])\n

gb = GearsBuilder()\n
gb.map(extract_data)\n
gb.foreach(update_maximums)\n
gb.register('tile:*')"
```

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

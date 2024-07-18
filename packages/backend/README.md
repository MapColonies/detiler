# backend

# Redis Migration
## redis search index creation:
```
FT.CREATE tileDetailsIdx ON JSON PREFIX 1 tile: SCHEMA $.kit AS kit TEXT $.updatedAt AS updatedAt NUMERIC $.createdAt AS createdAt NUMERIC $.updateCount AS updateCount NUMERIC $.coordiantes AS coordinates GEO $.geoshape AS geoshape GEOSHAPE SPHERICAL $.state AS state NUMERIC $.z AS z NUMERIC $.x AS x NUMERIC $.y AS y NUMERIC
```

## redis triggers and functions creation:
used to maintain post processing metadata for each kit such as `maxState` and `maxUpdatedAt`

execute with `redis-cli`
```
TFUNCTION LOAD REPLACE "#!js name=LibName api_version=1.0\n
    function getMaximum(client, data) {
        currentKit = client.call('json.get', data.key, 'kit');
        currentState = client.call('json.get', data.key, 'state');
        currentUpdatedAt = client.call('json.get', data.key, 'updatedAt');
        key = 'kit:' + currentKit.slice(1, currentKit.length - 1);
        maxState = client.call('hget', key, 'maxState');
        if(maxState < currentState) {
            client.call('hset', key, 'maxState', currentState);
        }
        maxUpdatedAt = client.call('hget', key, 'maxUpdatedAt');
        if(maxUpdatedAt < currentUpdatedAt) {
            client.call('hset', key, 'maxUpdatedAt', currentUpdatedAt);
        }
    }

    redis.registerKeySpaceTrigger('test2', 'tile:', getMaximum);"
```

# Tests

integration tests are missing due to `node-redis` library structure, [see open issue here](https://github.com/redis/node-redis/issues/2546)

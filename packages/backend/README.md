# backend

redis migration:
```
FT.CREATE tileDetailsIdx ON JSON PREFIX 1 tile: SCHEMA $.kit AS kit TEXT $.updatedAt AS updatedAt NUMERIC $.createdAt AS createdAt NUMERIC $.updateCount AS updateCount NUMERIC $.coordiantes AS coordinates GEO $.geoshape AS geoshape GEOSHAPE SPHERICAL $.state AS state NUMERIC $.z AS z NUMERIC $.x AS x NUMERIC $.y AS y NUMERIC
```

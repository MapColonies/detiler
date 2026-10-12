# Backend API e2e tests

Unlike `tests/unit`, these hit a **real, already-running** backend over HTTP (via `supertest`) and assert on
actual response status codes/bodies. No mocks.

This sidesteps the integration-test blocker noted in the README (node-redis/node-redis#2546): the tests never
import `redis` or talk to it directly, they only exercise the public HTTP API, so that library issue doesn't apply here.

Contract validation against `openapi3.yaml` via `jest-openapi`'s `toSatisfyApiSpec()` was tried and dropped: the
spec's `longitude` schema uses OpenAPI 3.0-style `exclusiveMinimum: true` (a boolean modifier on `minimum`), which
`jest-openapi`'s validator rejects outright (it expects the OpenAPI 3.1 form where `exclusiveMinimum` itself holds
the numeric bound) — it fails to load the spec at all, for every test file, regardless of which endpoint is under
test. Fixing that is a one-line change to `openapi3.yaml` (`minimum: -180` / `exclusiveMinimum: true` →
`exclusiveMinimum: -180`), but it's a pre-existing issue orthogonal to this test suite, left alone here.

## Prerequisites

A backend instance reachable at `E2E_API_BASE_URL` (default `http://localhost:8080`), backed by a real
`redis/redis-stack-server:7.2.0-v10` (RedisJSON + RediSearch, `GEOSHAPE` support). This suite does **not** start
or stop either for you — bring your own stack:

```bash
docker run -d --name detiler-redis -p 6379:6379 redis/redis-stack-server:7.2.0-v10
npx lerna run build
cd packages/backend && npm start
```

## Running

```bash
npm run test:e2e
```

## Notes

- Tests use a fixed kit name, `e2esmoketest` (deliberately no hyphen — `tileDetailsIdx` indexes `kit` as a
  RediSearch `TEXT` field, and an unquoted `-` inside a query term is parsed as NOT, silently matching zero
  tiles; see the root CLAUDE.md "Known index gotcha").
- Tile coordinates use `z=3, x=0/1, y=0` — the minimum zoom where the `tile-calc` metatile grid
  (`TILEGRID_WORLD_CRS84` + `METATILE_SIZE=8`) has any valid tiles at all.
- There's no delete endpoint for kits/tiles/cooldowns, so reruns accumulate a handful of rows under the
  `e2esmoketest` kit rather than failing — that's expected, not a leak to chase.

// no hyphen: tileDetailsIdx indexes `kit` as RediSearch TEXT, and an unquoted "-" in a query term is parsed
// as NOT, silently matching zero tiles (see root CLAUDE.md "Known index gotcha").
export const TEST_KIT = 'e2esmoketest';

// minimum zoom where the tile-calc metatile grid (TILEGRID_WORLD_CRS84 + METATILE_SIZE=8) has any valid tiles:
// at zoom z, x spans [0, 2*2^z/8) and y spans [0, 2^z/8), which is empty until 2^z >= 8, i.e. z >= 3.
export const TEST_TILE = { z: 3, x: 0, y: 0 };
export const UNTOUCHED_TEST_TILE = { z: 3, x: 1, y: 0 };

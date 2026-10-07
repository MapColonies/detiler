import { beforeAll, describe, expect, it } from 'vitest';
import { StatusCodes } from 'http-status-codes';
import { request } from '../utils/request';
import { TEST_KIT, TEST_TILE, UNTOUCHED_TEST_TILE } from '../utils/fixtures';

const tilePath = (kit: string, tile: { z: number; x: number; y: number }): string => `/detail/${kit}/${tile.z}/${tile.x}/${tile.y}`;

describe('tile details API', () => {
  beforeAll(async () => {
    await request.post('/kits').send({ name: TEST_KIT });
  });

  it('should upserts a tile and reads back the same data by kit', async () => {
    const timestamp = Date.now();

    const putRes = await request.put(tilePath(TEST_KIT, TEST_TILE)).send({ timestamp, state: 5, status: 'rendered' });

    expect([StatusCodes.CREATED, StatusCodes.NO_CONTENT]).toContain(putRes.status);

    const getRes = await request.get(tilePath(TEST_KIT, TEST_TILE));

    expect(getRes.status).toBe(StatusCodes.OK);
    expect(getRes.body).toEqual(
      expect.objectContaining({
        kit: TEST_KIT,
        z: TEST_TILE.z,
        x: TEST_TILE.x,
        y: TEST_TILE.y,
        state: 5,
        updatedAt: timestamp,
        renderedAt: timestamp,
      })
    );
  });

  it('should reflects the write in GET /kits (maxState/maxUpdatedAt raised)', async () => {
    const timestamp = Date.now();

    await request.put(tilePath(TEST_KIT, TEST_TILE)).send({ timestamp, state: 9, status: 'rendered' });

    const listRes = await request.get('/kits');
    const kit = (listRes.body as { name: string; maxState: string; maxUpdatedAt: string }[]).find((k) => k.name === TEST_KIT);

    expect(kit).toBeDefined();
    expect(Number(kit?.maxState)).toBeGreaterThanOrEqual(9);
    expect(Number(kit?.maxUpdatedAt)).toBeGreaterThanOrEqual(timestamp);
  });

  it('should is retrievable through the multi-kit GET /detail/{z}/{x}/{y} route as well', async () => {
    const res = await request.get(`/detail/${TEST_TILE.z}/${TEST_TILE.x}/${TEST_TILE.y}`).query({ kits: [TEST_KIT] });

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body).toEqual(expect.arrayContaining([expect.objectContaining({ kit: TEST_KIT, z: TEST_TILE.z, x: TEST_TILE.x, y: TEST_TILE.y })]));
  });

  it('should returns 404 for a tile that was never written', async () => {
    const res = await request.get(tilePath(TEST_KIT, UNTOUCHED_TEST_TILE));

    expect(res.status).toBe(StatusCodes.NOT_FOUND);
  });

  it('should returns 404 when writing to a kit that does not exist', async () => {
    const res = await request.put(tilePath('doesnotexistkit', TEST_TILE)).send({ timestamp: Date.now() });

    expect(res.status).toBe(StatusCodes.NOT_FOUND);
  });
});

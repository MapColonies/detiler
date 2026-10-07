import { describe, expect, it } from 'vitest';
import { StatusCodes } from 'http-status-codes';
import { request } from '../utils/request';
import { TEST_KIT } from '../utils/fixtures';

describe('kit API', () => {
  it('should creates the test kit (or confirms it already exists) and lists it via GET /kits', async () => {
    const createRes = await request.post('/kits').send({ name: TEST_KIT });

    expect([StatusCodes.CREATED, StatusCodes.CONFLICT]).toContain(createRes.status);

    const listRes = await request.get('/kits');

    expect(listRes.status).toBe(StatusCodes.OK);
    expect(listRes.body).toEqual(expect.arrayContaining([expect.objectContaining({ name: TEST_KIT })]));
  });

  it('should rejects creating the same kit twice with 409', async () => {
    await request.post('/kits').send({ name: TEST_KIT });

    const res = await request.post('/kits').send({ name: TEST_KIT });

    expect(res.status).toBe(StatusCodes.CONFLICT);
  });
});

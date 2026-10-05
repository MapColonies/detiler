import { beforeAll, describe, expect, it } from 'vitest';
import { StatusCodes } from 'http-status-codes';
import { request } from '../utils/request';
import { TEST_KIT } from '../utils/fixtures';

describe('cooldown API', () => {
  beforeAll(async () => {
    await request.post('/kits').send({ name: TEST_KIT });
  });

  it('creates a cooldown and lists it back filtered by kit', async () => {
    const createRes = await request.post('/cooldown').send({
      duration: 3600,
      kits: [TEST_KIT],
      minZoom: 0,
      maxZoom: 10,
      enabled: true,
    });

    expect(createRes.status).toBe(StatusCodes.CREATED);

    const listRes = await request.get('/cooldown').query({ kits: [TEST_KIT] });

    expect(listRes.status).toBe(StatusCodes.OK);
    expect(listRes.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- vitest's arrayContaining/objectContaining are typed to return `any` by design
          kits: expect.arrayContaining([TEST_KIT]),
          duration: 3600,
          minZoom: 0,
          maxZoom: 10,
          enabled: true,
        }),
      ])
    );
  });
});

import nock from 'nock';
import { AxiosError } from 'axios';
import httpStatusCodes from 'http-status-codes';
import { TileDetails, TileDetailsPayload, TileParams, TileParamsWithKit, TileQueryParams } from '@map-colonies/detiler-common';
import { DetilerClient } from '../../src';

const MOCK_DETILER_URL = 'http://detiler.com';

describe('Client', () => {
  let detiler: DetilerClient;

  beforeEach(() => {
    detiler = new DetilerClient({ url: MOCK_DETILER_URL });
    jest.resetAllMocks();
    nock.cleanAll();
  });

  describe('#getKits', () => {
    it('should get all kits', async function () {
      const kit1 = 'kit1';
      const kit2 = 'kit2';
      nock(MOCK_DETILER_URL).get('/kits').reply(httpStatusCodes.OK, [kit1, kit2]);
      const getSpy = jest.spyOn(detiler['axios'], 'get');

      const response = await detiler.getKits();

      expect(response).toMatchObject([kit1, kit2]);
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(`${MOCK_DETILER_URL}/kits`);
    });

    it('should throw an error if the http get request has errored', async function () {
      nock(MOCK_DETILER_URL).get(`/kits`).reply(httpStatusCodes.INTERNAL_SERVER_ERROR);
      const getSpy = jest.spyOn(detiler['axios'], 'get');

      await expect(detiler.getKits()).rejects.toThrow(AxiosError);
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(`${MOCK_DETILER_URL}/kits`);
    });
  });

  describe('#queryTilesDetails', () => {
    it('should query details according to params', async function () {
      const details = { a: 1 };
      const params: TileQueryParams = { kits: ['a'], minZoom: 1, maxZoom: 2, bbox: [1, 2, 3, 4] };
      nock(MOCK_DETILER_URL)
        .get(`/detail`)
        .query({ ...params })
        .reply(httpStatusCodes.OK, details);
      const getSpy = jest.spyOn(detiler['axios'], 'get');

      const response = await detiler.queryTilesDetails(params);

      expect(response).toMatchObject(details);
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(`${MOCK_DETILER_URL}/detail`, expect.objectContaining({ params }));
    });

    it('should throw an error if the http get request has errored', async function () {
      const params: TileQueryParams = { kits: ['a'], minZoom: 1, maxZoom: 2, bbox: [1, 2, 3, 4] };
      nock(MOCK_DETILER_URL)
        .get(`/detail`)
        .query({ ...params })
        .reply(httpStatusCodes.INTERNAL_SERVER_ERROR);
      const getSpy = jest.spyOn(detiler['axios'], 'get');

      await expect(detiler.queryTilesDetails(params)).rejects.toThrow(AxiosError);
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(`${MOCK_DETILER_URL}/detail`, expect.objectContaining({ params }));
    });
  });

  describe('#queryTilesDetailsAsyncGenerator', () => {
    it('should query generate details according to params including extra empty res call', async function () {
      const details1 = { a: 1 };
      const details2 = { a: 2 };
      const details3 = { a: 3 };
      let data: TileDetails[] = [];
      const params1: TileQueryParams = { size: 1, from: 0, kits: ['a'], minZoom: 1, maxZoom: 2, bbox: [1, 2, 3, 4] };
      const params2: TileQueryParams = { size: 1, from: 1, kits: ['a'], minZoom: 1, maxZoom: 2, bbox: [1, 2, 3, 4] };
      const params3: TileQueryParams = { size: 1, from: 2, kits: ['a'], minZoom: 1, maxZoom: 2, bbox: [1, 2, 3, 4] };
      const lastParams: TileQueryParams = { size: 1, from: 3, kits: ['a'], minZoom: 1, maxZoom: 2, bbox: [1, 2, 3, 4] };

      nock(MOCK_DETILER_URL)
        .get(`/detail`)
        .query({ ...params1 })
        .once()
        .reply(httpStatusCodes.OK, [details1]);
      nock(MOCK_DETILER_URL)
        .get(`/detail`)
        .query({ ...params2 })
        .twice()
        .reply(httpStatusCodes.OK, [details2]);
      nock(MOCK_DETILER_URL)
        .get(`/detail`)
        .query({ ...params3 })
        .thrice()
        .reply(httpStatusCodes.OK, [details3]);
      nock(MOCK_DETILER_URL)
        .get(`/detail`)
        .query({ ...lastParams })
        .reply(httpStatusCodes.OK, []);
      const getSpy = jest.spyOn(detiler['axios'], 'get');

      const queryGenerator = detiler.queryTilesDetailsAsyncGenerator(params1);

      for await (const pageData of queryGenerator) {
        data = [...data, ...pageData];
      }

      expect(data).toMatchObject([details1, details2, details3]);
      expect(getSpy).toHaveBeenCalledTimes(4);
    });

    it('should query generate details according to params until done', async function () {
      const details1 = [{ a: 1 }, { a: 2 }];
      const details2 = [{ a: 3 }, { a: 4 }];
      const details3 = [{ a: 5 }];
      let data: TileDetails[] = [];
      const params1: TileQueryParams = { size: 2, from: 0, kits: ['a'], minZoom: 1, maxZoom: 2, bbox: [1, 2, 3, 4] };
      const params2: TileQueryParams = { size: 2, from: 2, kits: ['a'], minZoom: 1, maxZoom: 2, bbox: [1, 2, 3, 4] };
      const params3: TileQueryParams = { size: 2, from: 4, kits: ['a'], minZoom: 1, maxZoom: 2, bbox: [1, 2, 3, 4] };

      nock(MOCK_DETILER_URL)
        .get(`/detail`)
        .query({ ...params1 })
        .once()
        .reply(httpStatusCodes.OK, details1);
      nock(MOCK_DETILER_URL)
        .get(`/detail`)
        .query({ ...params2 })
        .twice()
        .reply(httpStatusCodes.OK, details2);
      nock(MOCK_DETILER_URL)
        .get(`/detail`)
        .query({ ...params3 })
        .thrice()
        .reply(httpStatusCodes.OK, details3);
      const getSpy = jest.spyOn(detiler['axios'], 'get');

      const queryGenerator = detiler.queryTilesDetailsAsyncGenerator(params1);

      for await (const pageData of queryGenerator) {
        data = [...data, ...pageData];
      }

      expect(data).toMatchObject([...details1, ...details2, ...details3]);
      expect(getSpy).toHaveBeenCalledTimes(3);
    });

    it('should query generate details according to params with default size and from', async function () {
      const details = [{ a: 1 }];
      let data: TileDetails[] = [];
      const params: TileQueryParams = { kits: ['a'], minZoom: 1, maxZoom: 2, bbox: [1, 2, 3, 4] };

      nock(MOCK_DETILER_URL)
        .get(`/detail`)
        .query({ ...params, from: 0, size: 100 })
        .once()
        .reply(httpStatusCodes.OK, details);
      const getSpy = jest.spyOn(detiler['axios'], 'get');

      const queryGenerator = detiler.queryTilesDetailsAsyncGenerator(params);

      for await (const pageData of queryGenerator) {
        data = [...data, ...pageData];
      }

      expect(data).toMatchObject(details);
      expect(getSpy).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if the http get request has errored', async function () {
      const params: TileQueryParams = { from: 0, size: 10, kits: ['a'], minZoom: 1, maxZoom: 2, bbox: [1, 2, 3, 4] };
      nock(MOCK_DETILER_URL)
        .get(`/detail`)
        .query({ ...params })
        .reply(httpStatusCodes.INTERNAL_SERVER_ERROR);
      const getSpy = jest.spyOn(detiler['axios'], 'get');

      const queryGenerator = detiler.queryTilesDetailsAsyncGenerator(params);

      await expect(queryGenerator.next()).rejects.toThrow(AxiosError);
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(`${MOCK_DETILER_URL}/detail`, expect.objectContaining({ params }));
    });
  });

  describe('#getTileDetails', () => {
    it('should get tile details according to params', async function () {
      const details = { a: 1 };
      const params: TileParamsWithKit = { kit: 'kit', z: 1, x: 1, y: 1 };
      nock(MOCK_DETILER_URL).get(`/detail/${params.kit}/${params.z}/${params.x}/${params.y}`).reply(httpStatusCodes.OK, details);
      const getSpy = jest.spyOn(detiler['axios'], 'get');

      const response = await detiler.getTileDetails(params);

      expect(response).toMatchObject(details);
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(`${MOCK_DETILER_URL}/detail/${params.kit}/${params.z}/${params.x}/${params.y}`);
    });

    it('should retrun null if tile details were not found', async function () {
      const params: TileParamsWithKit = { kit: 'kit', z: 1, x: 1, y: 1 };
      nock(MOCK_DETILER_URL).get(`/detail/${params.kit}/${params.z}/${params.x}/${params.y}`).reply(httpStatusCodes.NOT_FOUND);
      const getSpy = jest.spyOn(detiler['axios'], 'get');

      const response = await detiler.getTileDetails(params);

      expect(response).toBeNull();
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(`${MOCK_DETILER_URL}/detail/${params.kit}/${params.z}/${params.x}/${params.y}`);
    });

    it('should throw an error if the http get request has errored', async function () {
      const params: TileParamsWithKit = { kit: 'kit', z: 1, x: 1, y: 1 };
      nock(MOCK_DETILER_URL).get(`/detail/${params.kit}/${params.z}/${params.x}/${params.y}`).reply(httpStatusCodes.INTERNAL_SERVER_ERROR);
      const getSpy = jest.spyOn(detiler['axios'], 'get');

      await expect(detiler.getTileDetails(params)).rejects.toThrow(AxiosError);
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(`${MOCK_DETILER_URL}/detail/${params.kit}/${params.z}/${params.x}/${params.y}`);
    });
  });

  describe('#getTilesDetails', () => {
    it('should get tiles details according to params', async function () {
      const details = { a: 1 };
      const params: TileParams & { kits?: string[] } = { kits: ['kit1', 'kit2'], z: 1, x: 1, y: 1 };
      nock(MOCK_DETILER_URL).get(`/detail/${params.z}/${params.x}/${params.y}`).reply(httpStatusCodes.OK, details);
      const getSpy = jest.spyOn(detiler['axios'], 'get');

      const response = await detiler.getTilesDetails(params);

      expect(response).toMatchObject(details);
      expect(getSpy).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if the http get request has errored', async function () {
      const params: TileParams & { kits?: string[] } = { kits: ['kit1', 'kit2'], z: 1, x: 1, y: 1 };
      nock(MOCK_DETILER_URL).get(`/detail/${params.z}/${params.x}/${params.y}`).reply(httpStatusCodes.INTERNAL_SERVER_ERROR);
      const getSpy = jest.spyOn(detiler['axios'], 'get');

      await expect(detiler.getTilesDetails(params)).rejects.toThrow(AxiosError);

      expect(getSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('#setTileDetails', () => {
    it('should set tiles details according to params', async function () {
      const params: TileParamsWithKit = { kit: 'kit', z: 1, x: 1, y: 1 };
      const payload: TileDetailsPayload = { state: 1, timestamp: 1 };
      nock(MOCK_DETILER_URL).put(`/detail/${params.kit}/${params.z}/${params.x}/${params.y}`).reply(httpStatusCodes.CREATED);
      const putSpy = jest.spyOn(detiler['axios'], 'put');

      await detiler.setTileDetails(params, payload);

      expect(putSpy).toHaveBeenCalledTimes(1);
      expect(putSpy).toHaveBeenCalledWith(`${MOCK_DETILER_URL}/detail/${params.kit}/${params.z}/${params.x}/${params.y}`, payload);
    });

    it('should throw an error if the http put request has errored', async function () {
      const params: TileParamsWithKit = { kit: 'kit', z: 1, x: 1, y: 1 };
      const payload: TileDetailsPayload = { state: 1, timestamp: 1 };
      nock(MOCK_DETILER_URL).put(`/detail/${params.kit}/${params.z}/${params.x}/${params.y}`).reply(httpStatusCodes.INTERNAL_SERVER_ERROR);
      const putSpy = jest.spyOn(detiler['axios'], 'put');

      await expect(detiler.setTileDetails(params, payload)).rejects.toThrow(AxiosError);

      expect(putSpy).toHaveBeenCalledTimes(1);
      expect(putSpy).toHaveBeenCalledWith(`${MOCK_DETILER_URL}/detail/${params.kit}/${params.z}/${params.x}/${params.y}`, payload);
    });
  });

  describe('#configuration', () => {
    it('should throw an error if http request has errored with a retry strategy on every attempt', async function () {
      const networkError = new Error('Some connection error');
      const detilerWithRetry = new DetilerClient({
        url: MOCK_DETILER_URL,
        enableRetryStrategy: true,
        retryStrategy: {
          retries: 3,
        },
      });

      const params: TileParamsWithKit = { kit: 'kit', z: 1, x: 1, y: 1 };
      nock(MOCK_DETILER_URL).persist().get(`/detail/${params.kit}/${params.z}/${params.x}/${params.y}`).replyWithError(networkError);
      const spyWithRetry = jest.spyOn(detilerWithRetry['axios'], 'get');

      await expect(detilerWithRetry.getTileDetails(params)).rejects.toThrow(AxiosError);
      expect(spyWithRetry).toHaveBeenCalledTimes(1);
      expect(spyWithRetry).toHaveBeenCalledWith(`${MOCK_DETILER_URL}/detail/${params.kit}/${params.z}/${params.x}/${params.y}`);
    });

    it('should complete request on the third attempt when retry strategy is enabled', async function () {
      const networkError = new Error('Some connection error');
      const detilerWithRetry = new DetilerClient({
        url: MOCK_DETILER_URL,
        enableRetryStrategy: true,
        retryStrategy: {
          retries: 3,
        },
      });
      const params: TileParamsWithKit = { kit: 'kit', z: 1, x: 1, y: 1 };
      const details = { a: 1 };
      nock(MOCK_DETILER_URL).get(`/detail/${params.kit}/${params.z}/${params.x}/${params.y}`).once().replyWithError(networkError);
      nock(MOCK_DETILER_URL).get(`/detail/${params.kit}/${params.z}/${params.x}/${params.y}`).twice().replyWithError(networkError);
      nock(MOCK_DETILER_URL).get(`/detail/${params.kit}/${params.z}/${params.x}/${params.y}`).thrice().reply(httpStatusCodes.OK, details);
      const spyWithRetry = jest.spyOn(detilerWithRetry['axios'], 'get');

      const response = await detilerWithRetry.getTileDetails(params);

      expect(response).toMatchObject(details);

      expect(spyWithRetry).toHaveBeenCalledTimes(1);
      expect(spyWithRetry).toHaveBeenCalledWith(`${MOCK_DETILER_URL}/detail/${params.kit}/${params.z}/${params.x}/${params.y}`);
    });

    it('should complete request on the third attempt when retry strategy is enabled and exponential', async function () {
      const networkError = new Error('Some connection error');
      const detilerWithRetry = new DetilerClient({
        url: MOCK_DETILER_URL,
        enableRetryStrategy: true,
        retryStrategy: {
          retries: 3,
          isExponential: true,
        },
      });
      const params: TileParamsWithKit = { kit: 'kit', z: 1, x: 1, y: 1 };
      const details = { a: 1 };
      nock(MOCK_DETILER_URL).get(`/detail/${params.kit}/${params.z}/${params.x}/${params.y}`).once().replyWithError(networkError);
      nock(MOCK_DETILER_URL).get(`/detail/${params.kit}/${params.z}/${params.x}/${params.y}`).twice().replyWithError(networkError);
      nock(MOCK_DETILER_URL).get(`/detail/${params.kit}/${params.z}/${params.x}/${params.y}`).thrice().reply(httpStatusCodes.OK, details);
      const spyWithRetry = jest.spyOn(detilerWithRetry['axios'], 'get');

      const response = await detilerWithRetry.getTileDetails(params);

      expect(response).toMatchObject(details);

      expect(spyWithRetry).toHaveBeenCalledTimes(1);
      expect(spyWithRetry).toHaveBeenCalledWith(`${MOCK_DETILER_URL}/detail/${params.kit}/${params.z}/${params.x}/${params.y}`);
    });

    it('should attach headers and complete request on the third attempt when retry strategy is enabled', async function () {
      const networkError = new Error('Some connection error');
      const headers = { ['x-api-key']: 'secret', header: 'key' };
      const detilerWithRetry = new DetilerClient({
        url: MOCK_DETILER_URL,
        headers,
        enableRetryStrategy: true,
        retryStrategy: {
          retries: 3,
        },
      });
      const params: TileParamsWithKit = { kit: 'kit', z: 1, x: 1, y: 1 };
      const details = { a: 1 };
      nock(MOCK_DETILER_URL).get(`/detail/${params.kit}/${params.z}/${params.x}/${params.y}`).once().replyWithError(networkError);
      nock(MOCK_DETILER_URL).get(`/detail/${params.kit}/${params.z}/${params.x}/${params.y}`).twice().replyWithError(networkError);
      nock(MOCK_DETILER_URL).get(`/detail/${params.kit}/${params.z}/${params.x}/${params.y}`).thrice().reply(httpStatusCodes.OK, details);
      const spyWithRetry = jest.spyOn(detilerWithRetry['axios'], 'get');

      detilerWithRetry['axios'].interceptors.request.use((req) => {
        expect(req.headers).toEqual(expect.objectContaining(headers));
        return req;
      });

      const response = await detilerWithRetry.getTileDetails(params);

      expect(response).toMatchObject(details);

      expect(spyWithRetry).toHaveBeenCalledTimes(1);
      expect(spyWithRetry).toHaveBeenCalledWith(`${MOCK_DETILER_URL}/detail/${params.kit}/${params.z}/${params.x}/${params.y}`);
    });
  });
});

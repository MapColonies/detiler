import supertest from 'supertest';

export const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://localhost:8080';

export const request = supertest(API_BASE_URL);

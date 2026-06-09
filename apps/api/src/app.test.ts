import request from 'supertest';

import { createApp } from './app.js';

describe('health endpoints', () => {
  it('returns health status', async () => {
    const app = createApp({ appEnv: 'test', port: 4000 });

    const response = await request(app).get('/health').expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'matria-api',
    });
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('marks readiness degraded until database is configured', async () => {
    const app = createApp({ appEnv: 'test', port: 4000 });

    const response = await request(app).get('/ready').expect(503);

    expect(response.body).toMatchObject({
      status: 'degraded',
      checks: {
        database: 'warn',
        contracts: 'pass',
      },
    });
  });

  it('marks readiness ready when database is configured', async () => {
    const app = createApp({
      appEnv: 'test',
      port: 4000,
      databaseUrl: 'postgres://matria:matria@localhost:5432/matria',
    });

    const response = await request(app).get('/ready').expect(200);

    expect(response.body.status).toBe('ready');
    expect(response.body.checks.database).toBe('pass');
  });
});

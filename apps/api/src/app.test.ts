import request from 'supertest';

import { createApp } from './app.js';
import type { Database, QueryResult } from './db/client.js';

function createReadyDatabase(): Database {
  return {
    async query<T = unknown>(text: string): Promise<QueryResult<T>> {
      if (text.includes('SELECT id FROM schema_migrations')) {
        return {
          rows: [{ id: '0001' }, { id: '0002' }, { id: '0003' }, { id: '0004' }, { id: '0005' }],
          rowCount: 5,
        } as QueryResult<T>;
      }

      if (text.includes("pg_extension WHERE extname = 'vector'")) {
        return {
          rows: [{ exists: true }],
          rowCount: 1,
        } as QueryResult<T>;
      }

      return {
        rows: [],
        rowCount: null,
      } as QueryResult<T>;
    },
    async connect() {
      throw new Error('connect is not used in tests');
    },
    async end() {
      return undefined;
    },
  };
}

describe('API runtime foundation', () => {
  it('returns health status with a request id', async () => {
    const app = await createApp({ appEnv: 'test', port: 4000 });

    const response = await request(app).get('/health').expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'matria-api',
    });
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('marks readiness degraded until database is configured', async () => {
    const app = await createApp({ appEnv: 'test', port: 4000 });

    const response = await request(app).get('/ready').expect(503);

    expect(response.body).toMatchObject({
      status: 'degraded',
      checks: {
        database: 'fail',
        migrations: 'fail',
        pgvector: 'fail',
        contracts: 'pass',
      },
    });
  });

  it('marks readiness ready when database, migrations, and pgvector are available', async () => {
    const app = await createApp(
      {
        appEnv: 'test',
        port: 4000,
        databaseUrl: 'postgres://matria:matria@localhost:5432/matria',
      },
      { database: createReadyDatabase() },
    );

    const response = await request(app).get('/ready').expect(200);

    expect(response.body).toMatchObject({
      status: 'ready',
      checks: {
        database: 'pass',
        migrations: 'pass',
        pgvector: 'pass',
        contracts: 'pass',
      },
    });
  });

  it('creates a bootstrap session and exposes it through /auth/session', async () => {
    const app = await createApp({
      appEnv: 'test',
      port: 4000,
      adminBootstrapEmail: 'admin@matria.local',
      adminBootstrapPassword: 'development-password',
    });
    const agent = request.agent(app);

    await agent
      .post('/auth/login')
      .send({ email: 'admin@matria.local', password: 'development-password' })
      .expect(200);

    const sessionResponse = await agent.get('/auth/session').expect(200);

    expect(sessionResponse.body).toMatchObject({
      authenticated: true,
      user: {
        email: 'admin@matria.local',
      },
    });
  });

  it('requires audit permission before returning audit logs', async () => {
    const app = await createApp({
      appEnv: 'test',
      port: 4000,
      adminBootstrapEmail: 'admin@matria.local',
      adminBootstrapPassword: 'development-password',
    });
    const agent = request.agent(app);

    await request(app).get('/audit-logs').expect(401);

    await agent
      .post('/auth/login')
      .send({ email: 'admin@matria.local', password: 'development-password' })
      .expect(200);

    const response = await agent.get('/audit-logs').expect(200);

    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'auth.login',
          resourceType: 'session',
        }),
      ]),
    );
  });
});

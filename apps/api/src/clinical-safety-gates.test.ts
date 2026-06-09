import request from 'supertest';

import { createApp } from './app.js';
import { createInMemoryAdminStore } from './admin/admin-store.js';

async function createTestApp() {
  const config = {
    appEnv: 'test' as const,
    port: 4000,
    adminBootstrapEmail: 'admin@matria.local',
    adminBootstrapPassword: 'development-password',
  };
  const adminStore = await createInMemoryAdminStore(config);
  const app = await createApp(config, { adminStore });
  const admin = request.agent(app);

  await admin
    .post('/auth/login')
    .send({ email: 'admin@matria.local', password: 'development-password' })
    .expect(200);

  return { admin, app };
}

async function createUserWithRoles(
  context: Awaited<ReturnType<typeof createTestApp>>,
  roleNames: string[],
) {
  const { admin, app } = context;

  const created = await admin
    .post('/admin/users')
    .send({
      email: `${roleNames.join('-')}@matria.local`,
      displayName: `${roleNames.join(' ')} User`,
      password: 'development-password',
      status: 'active',
    })
    .expect(201);

  await admin.post(`/admin/users/${created.body.data.id}/roles`).send({ roleNames }).expect(200);

  const agent = request.agent(app);
  await agent
    .post('/auth/login')
    .send({ email: created.body.data.email, password: 'development-password' })
    .expect(200);

  return agent;
}

describe('clinical safety gates and protected routes', () => {
  it('requires authentication for protected clinical, AI, FHIR, admin, and audit routes', async () => {
    const { app } = await createTestApp();
    const anonymous = request(app);

    await anonymous.post('/clinical/patients').send({}).expect(401);
    await anonymous.post('/ai/encounters/not-a-real-id/synthesis').send({}).expect(401);
    await anonymous.post('/fhir/outputs/not-a-real-id/export').send({}).expect(401);
    await anonymous.get('/admin/users').expect(401);
    await anonymous.get('/audit-logs').expect(401);
  });

  it('forbids users who lack route-specific clinical governance permissions', async () => {
    const context = await createTestApp();
    const auditor = await createUserWithRoles(context, ['auditor']);

    await auditor.get('/admin/audit-logs').expect(200);
    await auditor.post('/clinical/patients').send({}).expect(403);
    await auditor.post('/ai/encounters/not-a-real-id/synthesis').send({}).expect(403);
    await auditor.post('/fhir/outputs/not-a-real-id/export').send({}).expect(403);
    await auditor.get('/admin/users').expect(403);
  });
});

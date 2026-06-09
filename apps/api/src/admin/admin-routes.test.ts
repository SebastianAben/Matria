import request from 'supertest';

import { createApp } from '../app.js';
import { createInMemoryAdminStore } from './admin-store.js';

async function createAdminAgent() {
  const adminStore = await createInMemoryAdminStore({
    adminBootstrapEmail: 'admin@matria.local',
    adminBootstrapPassword: 'development-password',
  });
  const app = await createApp(
    {
      appEnv: 'test',
      port: 4000,
      adminBootstrapEmail: 'admin@matria.local',
      adminBootstrapPassword: 'development-password',
    },
    { adminStore },
  );
  const agent = request.agent(app);

  await agent
    .post('/auth/login')
    .send({ email: 'admin@matria.local', password: 'development-password' })
    .expect(200);

  return { agent, app };
}

describe('admin RBAC routes', () => {
  it('requires authentication and user admin permission for user administration', async () => {
    const { app } = await createAdminAgent();

    await request(app).get('/admin/users').expect(401);
  });

  it('lets bootstrap admin create users, assign roles, and see mutation audit events', async () => {
    const { agent } = await createAdminAgent();

    const created = await agent
      .post('/admin/users')
      .send({
        email: 'auditor@matria.local',
        displayName: 'Audit Reviewer',
        password: 'development-password',
        status: 'active',
      })
      .expect(201);
    const roles = await agent.get('/admin/roles').expect(200);
    const auditorRole = roles.body.data.find((role: { name: string }) => role.name === 'auditor');

    await agent
      .post(`/admin/users/${created.body.data.id}/roles`)
      .send({ roleNames: ['auditor'] })
      .expect(200);

    const users = await agent.get('/admin/users').expect(200);
    const auditLogs = await agent.get('/admin/audit-logs').expect(200);

    expect(auditorRole).toBeTruthy();
    expect(users.body.data).toEqual([
      expect.objectContaining({ email: 'admin@matria.local' }),
      expect.objectContaining({
        email: 'auditor@matria.local',
        roleNames: ['auditor'],
        permissions: ['audit:read'],
      }),
    ]);
    expect(auditLogs.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'admin.user.create' }),
        expect.objectContaining({ action: 'admin.user.roles.assign' }),
        expect.objectContaining({ action: 'audit.read' }),
      ]),
    );
  });

  it('blocks disabled users from login', async () => {
    const { agent, app } = await createAdminAgent();

    await agent
      .post('/admin/users')
      .send({
        email: 'disabled@matria.local',
        displayName: 'Disabled User',
        password: 'development-password',
        status: 'disabled',
      })
      .expect(201);

    await request(app)
      .post('/auth/login')
      .send({ email: 'disabled@matria.local', password: 'development-password' })
      .expect(401);
  });

  it('returns forbidden for a user without user administration permission', async () => {
    const { agent, app } = await createAdminAgent();

    const created = await agent
      .post('/admin/users')
      .send({
        email: 'auditor@matria.local',
        displayName: 'Audit Reviewer',
        password: 'development-password',
        status: 'active',
      })
      .expect(201);
    await agent
      .post(`/admin/users/${created.body.data.id}/roles`)
      .send({ roleNames: ['auditor'] })
      .expect(200);

    const auditor = request.agent(app);
    await auditor
      .post('/auth/login')
      .send({ email: 'auditor@matria.local', password: 'development-password' })
      .expect(200);

    await auditor.get('/admin/audit-logs').expect(200);
    await auditor.get('/admin/users').expect(403);
  });
});

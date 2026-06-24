import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { registerDonor, registerNgo, createMedicine, createAdminAndLogin, authHeader } from './helpers.js';

describe('Admin route access control', () => {
  it('rejects a donor account', async () => {
    const { token } = await registerDonor();
    const res = await request(app).get('/api/admin/overview').set(authHeader(token));
    expect(res.status).toBe(403);
  });

  it('rejects an NGO account', async () => {
    const { token } = await registerNgo();
    const res = await request(app).get('/api/admin/overview').set(authHeader(token));
    expect(res.status).toBe(403);
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).get('/api/admin/overview');
    expect(res.status).toBe(401);
  });

  it('allows an admin account', async () => {
    const { token } = await createAdminAndLogin();
    const res = await request(app).get('/api/admin/overview').set(authHeader(token));
    expect(res.status).toBe(200);
  });
});

describe('Admin overview and listing endpoints', () => {
  it('returns accurate platform counts', async () => {
    const { token: adminToken } = await createAdminAndLogin();
    const { token: donorToken } = await registerDonor();
    await registerNgo();
    await createMedicine(donorToken);

    const res = await request(app).get('/api/admin/overview').set(authHeader(adminToken));
    expect(res.body.totalDonors).toBeGreaterThanOrEqual(1);
    expect(res.body.totalNgos).toBeGreaterThanOrEqual(1);
    expect(res.body.totalMedicines).toBeGreaterThanOrEqual(1);
  });

  it('lists all users with role information', async () => {
    const { token: adminToken } = await createAdminAndLogin();
    await registerDonor({ email: 'list-test-donor@example.com' });

    const res = await request(app).get('/api/admin/users').set(authHeader(adminToken));
    expect(res.body.some((u) => u.email === 'list-test-donor@example.com')).toBe(true);
  });

  it('lists all medicine listings regardless of status', async () => {
    const { token: adminToken } = await createAdminAndLogin();
    const { token: donorToken } = await registerDonor();
    const medicine = await createMedicine(donorToken, { name: 'Admin Visible Listing' });

    const res = await request(app).get('/api/admin/medicines').set(authHeader(adminToken));
    expect(res.body.some((m) => m.id === medicine.id)).toBe(true);
  });
});

describe('Admin moderation actions', () => {
  it('removes a listing', async () => {
    const { token: adminToken } = await createAdminAndLogin();
    const { token: donorToken } = await registerDonor();
    const medicine = await createMedicine(donorToken);

    const del = await request(app).delete(`/api/admin/medicines/${medicine.id}`).set(authHeader(adminToken));
    expect(del.status).toBe(200);

    const browse = await request(app).get('/api/medicines');
    expect(browse.body.find((m) => m.id === medicine.id)).toBeUndefined();
  });

  it('removes a user account, cascading to their listings', async () => {
    const { token: adminToken } = await createAdminAndLogin();
    const { token: donorToken, user: donor } = await registerDonor();
    const medicine = await createMedicine(donorToken);

    const del = await request(app).delete(`/api/admin/users/${donor.id}`).set(authHeader(adminToken));
    expect(del.status).toBe(200);

    const browse = await request(app).get('/api/medicines');
    expect(browse.body.find((m) => m.id === medicine.id)).toBeUndefined();
  });

  it("an admin can't remove their own account", async () => {
    const { token: adminToken, user: admin } = await createAdminAndLogin();
    const res = await request(app).delete(`/api/admin/users/${admin.id}`).set(authHeader(adminToken));
    expect(res.status).toBe(400);
  });

  it('returns 404 when removing a nonexistent listing', async () => {
    const { token: adminToken } = await createAdminAndLogin();
    const res = await request(app).delete('/api/admin/medicines/999999').set(authHeader(adminToken));
    expect(res.status).toBe(404);
  });
});

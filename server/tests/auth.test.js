import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { registerDonor, registerNgo, authHeader } from './helpers.js';

describe('POST /api/auth/register', () => {
  it('creates a donor account and returns a token', async () => {
    const { token, user } = await registerDonor({ email: 'anita@example.com' });
    expect(token).toBeTruthy();
    expect(user.role).toBe('donor');
    expect(user.email).toBe('anita@example.com');
    expect(user.passwordHash).toBeUndefined(); // never leak the hash
  });

  it('requires an organization name for NGO accounts', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Clinic', email: 'clinic@example.com', password: 'password123', role: 'ngo', city: 'Chennai' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/organization name/i);
  });

  it('rejects a password shorter than 6 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Donor', email: 'short@example.com', password: '123', role: 'donor', city: 'Chennai' });

    expect(res.status).toBe(400);
  });

  it('rejects a duplicate email', async () => {
    await registerDonor({ email: 'dupe@example.com' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Another', email: 'dupe@example.com', password: 'password123', role: 'donor', city: 'Chennai' });

    expect(res.status).toBe(409);
  });

  it('rejects an invalid role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'X', email: 'x@example.com', password: 'password123', role: 'admin', city: 'Chennai' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    await registerDonor({ email: 'login-test@example.com', password: 'correctpass' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login-test@example.com', password: 'correctpass' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('rejects an incorrect password', async () => {
    await registerDonor({ email: 'wrongpass@example.com', password: 'correctpass' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrongpass@example.com', password: 'wrongpass' });

    expect(res.status).toBe(401);
  });

  it('rejects a nonexistent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever123' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the user for a valid token', async () => {
    const { token, user } = await registerNgo({ email: 'me-test@example.com' });
    const res = await request(app).get('/api/auth/me').set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
  });

  it('rejects a missing token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a malformed token', async () => {
    const res = await request(app).get('/api/auth/me').set(authHeader('not-a-real-token'));
    expect(res.status).toBe(401);
  });
});

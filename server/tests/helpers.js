// tests/helpers.js — small utilities shared across test files so each test
// doesn't have to repeat "register a donor, log in, grab the token."
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../app.js';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';

export async function registerDonor(overrides = {}) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Test Donor',
      email: `donor-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      password: 'password123',
      role: 'donor',
      city: 'Chennai',
      ...overrides,
    });
  return res.body; // { token, user }
}

export async function registerNgo(overrides = {}) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Test Clinic Contact',
      email: `ngo-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      password: 'password123',
      role: 'ngo',
      org_name: 'Test Clinic',
      city: 'Chennai',
      ...overrides,
    });
  return res.body;
}

// Admin accounts aren't reachable through the public register endpoint
// (see validation/schemas.js) — in real usage they're created by the seed
// script, so tests mirror that by inserting directly through the db layer
// and then logging in through the actual API, the same way the seeded
// admin account would.
export async function createAdminAndLogin(overrides = {}) {
  const email = overrides.email || `admin-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const password = overrides.password || 'password123';

  await db.insert(users).values({
    name: overrides.name || 'Test Admin',
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    role: 'admin',
    city: 'Chennai',
  });

  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body;
}

export function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

export async function createMedicine(token, overrides = {}) {
  const future = new Date();
  future.setDate(future.getDate() + 90);

  const res = await request(app)
    .post('/api/medicines')
    .set(authHeader(token))
    .send({
      name: 'Paracetamol 500mg',
      category: 'Pain Relief',
      quantity: 4,
      unit: 'strips',
      expiry_date: future.toISOString().split('T')[0],
      city: 'Chennai',
      ...overrides,
    });
  return res.body;
}

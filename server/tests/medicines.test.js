import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { registerDonor, registerNgo, createMedicine, authHeader } from './helpers.js';

describe('POST /api/medicines', () => {
  it('lets a donor create a listing', async () => {
    const { token } = await registerDonor();
    const medicine = await createMedicine(token, { name: 'Insulin Glargine' });

    expect(medicine.name).toBe('Insulin Glargine');
    expect(medicine.status).toBe('available');
    expect(medicine.urgency).toBe('fresh');
  });

  it('rejects a listing from an NGO account', async () => {
    const { token } = await registerNgo();
    const res = await request(app)
      .post('/api/medicines')
      .set(authHeader(token))
      .send({ name: 'X', category: 'Pain Relief', quantity: 1, expiry_date: '2099-01-01', city: 'Chennai' });

    expect(res.status).toBe(403);
  });

  it('rejects an already-expired expiry date', async () => {
    const { token } = await registerDonor();
    const res = await request(app)
      .post('/api/medicines')
      .set(authHeader(token))
      .send({ name: 'Old Medicine', category: 'Pain Relief', quantity: 1, expiry_date: '2020-01-01', city: 'Chennai' });

    expect(res.status).toBe(400);
  });

  it('rejects a zero or negative quantity', async () => {
    const { token } = await registerDonor();
    const res = await request(app)
      .post('/api/medicines')
      .set(authHeader(token))
      .send({ name: 'X', category: 'Pain Relief', quantity: 0, expiry_date: '2099-01-01', city: 'Chennai' });

    expect(res.status).toBe(400);
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/medicines')
      .send({ name: 'X', category: 'Pain Relief', quantity: 1, expiry_date: '2099-01-01', city: 'Chennai' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/medicines', () => {
  it('only returns available listings by default', async () => {
    const { token } = await registerDonor();
    await createMedicine(token, { name: 'Visible One' });

    const res = await request(app).get('/api/medicines');
    expect(res.status).toBe(200);
    expect(res.body.every((m) => m.status === 'available')).toBe(true);
  });

  it('filters by city', async () => {
    const { token } = await registerDonor();
    await createMedicine(token, { name: 'Chennai Medicine', city: 'Chennai' });
    await createMedicine(token, { name: 'Mumbai Medicine', city: 'Mumbai' });

    const res = await request(app).get('/api/medicines').query({ city: 'Mumbai' });
    expect(res.body.every((m) => m.city === 'Mumbai')).toBe(true);
    expect(res.body.find((m) => m.name === 'Mumbai Medicine')).toBeTruthy();
  });

  it('filters by search term', async () => {
    const { token } = await registerDonor();
    await createMedicine(token, { name: 'Amoxicillin 250mg' });
    await createMedicine(token, { name: 'Cetirizine 10mg' });

    const res = await request(app).get('/api/medicines').query({ search: 'Amox' });
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Amoxicillin 250mg');
  });
});

describe('Location-based distance sorting', () => {
  it('attaches distance_km when the requester is an NGO with a saved location', async () => {
    const { token: donorToken } = await registerDonor({ lat: 13.0827, lng: 80.2707 });
    const { token: ngoToken } = await registerNgo({ lat: 13.09, lng: 80.27 });
    await createMedicine(donorToken);

    const res = await request(app).get('/api/medicines').set(authHeader(ngoToken));
    expect(res.body[0].distance_km).toBeTypeOf('number');
    expect(res.body[0].distance_km).toBeLessThan(20);
  });

  it('omits distance_km for an anonymous (unauthenticated) request', async () => {
    const { token: donorToken } = await registerDonor({ lat: 13.0827, lng: 80.2707 });
    await createMedicine(donorToken);

    const res = await request(app).get('/api/medicines');
    expect(res.body[0].distance_km).toBeNull();
  });

  it('sorts nearest-first when sort=distance', async () => {
    const { token: nearDonor } = await registerDonor({ lat: 13.0827, lng: 80.2707, email: 'near@example.com' });
    const { token: farDonor } = await registerDonor({ lat: 11.0168, lng: 76.9558, email: 'far@example.com' });
    const { token: ngoToken } = await registerNgo({ lat: 13.09, lng: 80.27 });

    await createMedicine(farDonor, { name: 'Far Medicine' });
    await createMedicine(nearDonor, { name: 'Near Medicine' });

    const res = await request(app).get('/api/medicines').query({ sort: 'distance' }).set(authHeader(ngoToken));
    expect(res.body[0].name).toBe('Near Medicine');
    expect(res.body[res.body.length - 1].name).toBe('Far Medicine');
  });
});


describe('Medicine claim lifecycle', () => {
  it('lets an NGO claim an available medicine', async () => {
    const { token: donorToken } = await registerDonor();
    const { token: ngoToken } = await registerNgo();
    const medicine = await createMedicine(donorToken);

    const res = await request(app)
      .post(`/api/medicines/${medicine.id}/claim`)
      .set(authHeader(ngoToken))
      .send({ note: 'Will collect Monday' });

    expect(res.status).toBe(200);

    const listing = await request(app).get('/api/medicines/mine').set(authHeader(donorToken));
    expect(listing.body.find((m) => m.id === medicine.id).status).toBe('claimed');
  });

  it('gives the donor the claimant\'s contact info after a claim, so "reach out to arrange handover" is actually actionable', async () => {
    const { token: donorToken } = await registerDonor();
    const { token: ngoToken, user: ngo } = await registerNgo({ org_name: 'Test Clinic Contact Info' });
    const medicine = await createMedicine(donorToken);

    await request(app).post(`/api/medicines/${medicine.id}/claim`).set(authHeader(ngoToken));

    const listing = await request(app).get('/api/medicines/mine').set(authHeader(donorToken));
    const claimed = listing.body.find((m) => m.id === medicine.id);

    expect(claimed.claimed_by).toBeTruthy();
    expect(claimed.claimed_by.email).toBe(ngo.email);
    expect(claimed.claimed_by.name).toBe('Test Clinic Contact Info');
  });

  it('does not show claimant info for a still-available (unclaimed) listing', async () => {
    const { token: donorToken } = await registerDonor();
    const medicine = await createMedicine(donorToken);

    const listing = await request(app).get('/api/medicines/mine').set(authHeader(donorToken));
    const found = listing.body.find((m) => m.id === medicine.id);

    expect(found.claimed_by).toBeNull();
  });

  it('rejects claiming an already-claimed medicine', async () => {
    const { token: donorToken } = await registerDonor();
    const { token: ngo1 } = await registerNgo({ email: 'ngo1@example.com' });
    const { token: ngo2 } = await registerNgo({ email: 'ngo2@example.com' });
    const medicine = await createMedicine(donorToken);

    await request(app).post(`/api/medicines/${medicine.id}/claim`).set(authHeader(ngo1));
    const secondClaim = await request(app).post(`/api/medicines/${medicine.id}/claim`).set(authHeader(ngo2));

    expect(secondClaim.status).toBe(400);
  });

  it('rejects a donor trying to claim (role enforcement)', async () => {
    const { token: donorToken } = await registerDonor();
    const medicine = await createMedicine(donorToken);

    const res = await request(app).post(`/api/medicines/${medicine.id}/claim`).set(authHeader(donorToken));
    expect(res.status).toBe(403);
  });

  it('lets the donor mark a claimed medicine complete, and reflects it in NGO claim history', async () => {
    const { token: donorToken } = await registerDonor();
    const { token: ngoToken } = await registerNgo();
    const medicine = await createMedicine(donorToken);

    await request(app).post(`/api/medicines/${medicine.id}/claim`).set(authHeader(ngoToken));
    const completeRes = await request(app).patch(`/api/medicines/${medicine.id}/complete`).set(authHeader(donorToken));
    expect(completeRes.status).toBe(200);

    const history = await request(app).get('/api/medicines/claims/mine').set(authHeader(ngoToken));
    expect(history.body[0].status).toBe('completed');
  });

  it('rejects marking complete before it has been claimed', async () => {
    const { token: donorToken } = await registerDonor();
    const medicine = await createMedicine(donorToken);

    const res = await request(app).patch(`/api/medicines/${medicine.id}/complete`).set(authHeader(donorToken));
    expect(res.status).toBe(400);
  });

  it('lets a donor withdraw an unclaimed listing', async () => {
    const { token: donorToken } = await registerDonor();
    const medicine = await createMedicine(donorToken);

    const res = await request(app).patch(`/api/medicines/${medicine.id}/cancel`).set(authHeader(donorToken));
    expect(res.status).toBe(200);

    const browse = await request(app).get('/api/medicines');
    expect(browse.body.find((m) => m.id === medicine.id)).toBeUndefined();
  });

  it("rejects cancelling another donor's listing", async () => {
    const { token: donor1 } = await registerDonor({ email: 'owner@example.com' });
    const { token: donor2 } = await registerDonor({ email: 'intruder@example.com' });
    const medicine = await createMedicine(donor1);

    const res = await request(app).patch(`/api/medicines/${medicine.id}/cancel`).set(authHeader(donor2));
    expect(res.status).toBe(403);
  });
});

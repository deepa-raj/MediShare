import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { registerDonor, registerNgo, createMedicine, authHeader } from './helpers.js';

describe('Notification triggers', () => {
  it('notifies the donor when an NGO claims their medicine', async () => {
    const { token: donorToken } = await registerDonor();
    const { token: ngoToken, user: ngo } = await registerNgo();
    const medicine = await createMedicine(donorToken);

    await request(app).post(`/api/medicines/${medicine.id}/claim`).set(authHeader(ngoToken));

    const res = await request(app).get('/api/notifications').set(authHeader(donorToken));
    expect(res.body.unreadCount).toBe(1);
    expect(res.body.notifications[0].type).toBe('claim_received');
    expect(res.body.notifications[0].message).toContain(ngo.name);
    expect(res.body.notifications[0].message).toContain(medicine.name);
  });

  it('notifies the NGO when the donor confirms handover', async () => {
    const { token: donorToken } = await registerDonor();
    const { token: ngoToken } = await registerNgo();
    const medicine = await createMedicine(donorToken);

    await request(app).post(`/api/medicines/${medicine.id}/claim`).set(authHeader(ngoToken));
    await request(app).patch(`/api/medicines/${medicine.id}/complete`).set(authHeader(donorToken));

    const res = await request(app).get('/api/notifications').set(authHeader(ngoToken));
    expect(res.body.notifications.some((n) => n.type === 'handover_confirmed')).toBe(true);
  });

  it('notifies nearby NGOs (within radius) when a donor posts a new listing', async () => {
    // Two points ~5km apart in Chennai — within the notification radius.
    const { token: donorToken } = await registerDonor({ lat: 13.0827, lng: 80.2707 });
    const { token: ngoToken } = await registerNgo({ lat: 13.13, lng: 80.27 });

    await createMedicine(donorToken, { name: 'Nearby Test Medicine' });

    const res = await request(app).get('/api/notifications').set(authHeader(ngoToken));
    expect(res.body.notifications.some((n) => n.type === 'nearby_listing' && n.message.includes('Nearby Test Medicine'))).toBe(true);
  });

  it('does not notify NGOs far outside the radius', async () => {
    // Chennai donor, Coimbatore NGO — ~430km apart, well outside the radius.
    const { token: donorToken } = await registerDonor({ lat: 13.0827, lng: 80.2707 });
    const { token: ngoToken } = await registerNgo({ lat: 11.0168, lng: 76.9558 });

    await createMedicine(donorToken, { name: 'Far Away Test Medicine' });

    const res = await request(app).get('/api/notifications').set(authHeader(ngoToken));
    expect(res.body.notifications.some((n) => n.message.includes('Far Away Test Medicine'))).toBe(false);
  });

  it('does not notify anyone when neither party has shared a location', async () => {
    const { token: donorToken } = await registerDonor();
    const { token: ngoToken } = await registerNgo();

    await createMedicine(donorToken, { name: 'No Location Test Medicine' });

    const res = await request(app).get('/api/notifications').set(authHeader(ngoToken));
    expect(res.body.notifications.some((n) => n.message.includes('No Location Test Medicine'))).toBe(false);
  });
});

describe('Reading and acknowledging notifications', () => {
  it('marks a single notification as read', async () => {
    const { token: donorToken } = await registerDonor();
    const { token: ngoToken } = await registerNgo();
    const medicine = await createMedicine(donorToken);
    await request(app).post(`/api/medicines/${medicine.id}/claim`).set(authHeader(ngoToken));

    const before = await request(app).get('/api/notifications').set(authHeader(donorToken));
    const notificationId = before.body.notifications[0].id;

    const markRead = await request(app).patch(`/api/notifications/${notificationId}/read`).set(authHeader(donorToken));
    expect(markRead.status).toBe(200);

    const after = await request(app).get('/api/notifications').set(authHeader(donorToken));
    expect(after.body.unreadCount).toBe(0);
  });

  it("rejects marking another user's notification as read", async () => {
    const { token: donorToken } = await registerDonor();
    const { token: ngoToken } = await registerNgo();
    const medicine = await createMedicine(donorToken);
    await request(app).post(`/api/medicines/${medicine.id}/claim`).set(authHeader(ngoToken));

    const list = await request(app).get('/api/notifications').set(authHeader(donorToken));
    const notificationId = list.body.notifications[0].id;

    const res = await request(app).patch(`/api/notifications/${notificationId}/read`).set(authHeader(ngoToken));
    expect(res.status).toBe(403);
  });

  it('marks all notifications as read at once', async () => {
    const { token: donorToken } = await registerDonor({ lat: 13.0827, lng: 80.2707 });
    const { token: ngoToken } = await registerNgo({ lat: 13.09, lng: 80.27 });

    await createMedicine(donorToken, { name: 'First Listing' });
    await createMedicine(donorToken, { name: 'Second Listing' });

    const before = await request(app).get('/api/notifications').set(authHeader(ngoToken));
    expect(before.body.unreadCount).toBeGreaterThanOrEqual(2);

    await request(app).patch('/api/notifications/read-all').set(authHeader(ngoToken));

    const after = await request(app).get('/api/notifications').set(authHeader(ngoToken));
    expect(after.body.unreadCount).toBe(0);
  });
});

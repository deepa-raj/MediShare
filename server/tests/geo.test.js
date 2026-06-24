import { describe, it, expect } from 'vitest';
import { haversineDistanceKm } from '../utils/geo.js';

describe('haversineDistanceKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineDistanceKm(13.0827, 80.2707, 13.0827, 80.2707)).toBe(0);
  });

  it('matches the known straight-line distance between Chennai and Coimbatore (~430km)', () => {
    const distance = haversineDistanceKm(13.0827, 80.2707, 11.0168, 76.9558);
    expect(distance).toBeGreaterThan(400);
    expect(distance).toBeLessThan(460);
  });

  it('is symmetric regardless of point order', () => {
    const a = haversineDistanceKm(13.0827, 80.2707, 11.0168, 76.9558);
    const b = haversineDistanceKm(11.0168, 76.9558, 13.0827, 80.2707);
    expect(a).toBeCloseTo(b, 5);
  });

  it('gives a small distance for two nearby points within the same city', () => {
    // Roughly 5km apart within Chennai
    const distance = haversineDistanceKm(13.0827, 80.2707, 13.13, 80.27);
    expect(distance).toBeLessThan(10);
  });
});

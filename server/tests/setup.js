// tests/setup.js — runs once per test file. Resets all tables before each
// individual test so tests don't leak state into each other even though
// they share one in-memory database for the whole file.
import { beforeEach } from 'vitest';
import { rawDb } from '../db/client.js';

beforeEach(() => {
  rawDb.exec('DELETE FROM claims; DELETE FROM medicines; DELETE FROM users;');
});

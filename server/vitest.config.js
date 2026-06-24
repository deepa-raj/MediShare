import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Each test worker gets its own in-memory SQLite database — fast, and
    // never touches the real medishare.db file used by `npm run seed` / `npm start`.
    env: {
      DATABASE_PATH: ':memory:',
      JWT_SECRET: 'test-secret-do-not-use-in-production',
    },
    setupFiles: ['./tests/setup.js'],
  },
});

// db/client.js — database connection setup.
//
// We use Node's built-in `node:sqlite` (DatabaseSync) as the actual driver —
// no native compilation step, works the same on every machine — and wire it
// up to Drizzle ORM through Drizzle's `sqlite-proxy` driver, which accepts
// any callback that can run SQL and return rows. This gives us Drizzle's
// type-safe query builder (db.select().from(...).where(...)) without taking
// on a native binary dependency (better-sqlite3) or a Rust query engine
// with binaries that need network access at install time (Prisma).
//
// Table schema is still bootstrapped with plain CREATE TABLE statements
// (see schema.sql below) rather than drizzle-kit migrations, because
// drizzle-kit's CLI also expects a native/binary-backed driver for
// introspection. For a project this size, a single schema file is simpler
// and just as correct; a larger app would add drizzle-kit once on a
// machine where that's not a constraint.
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import path from 'path';
import { fileURLToPath } from 'url';
import * as schema from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'medishare.db');

export const rawDb = new DatabaseSync(dbPath);
rawDb.exec('PRAGMA journal_mode = WAL');
rawDb.exec('PRAGMA foreign_keys = ON');

rawDb.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL,
    org_name      TEXT,
    city          TEXT NOT NULL,
    phone         TEXT,
    lat           REAL,
    lng           REAL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS medicines (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    donor_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    category      TEXT NOT NULL,
    quantity      INTEGER NOT NULL,
    unit          TEXT NOT NULL DEFAULT 'strips',
    expiry_date   TEXT NOT NULL,
    description   TEXT,
    city          TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'claimed', 'completed', 'cancelled')),
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS claims (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id   INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    ngo_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'declined')),
    note          TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type          TEXT NOT NULL CHECK (type IN ('claim_received', 'handover_confirmed', 'nearby_listing')),
    message       TEXT NOT NULL,
    link          TEXT,
    is_read       INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_medicines_status ON medicines(status);
  CREATE INDEX IF NOT EXISTS idx_medicines_city ON medicines(city);
  CREATE INDEX IF NOT EXISTS idx_claims_medicine ON claims(medicine_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
`);

// --- Lightweight forward migration -----------------------------------
// This codebase shipped once already without lat/lng on `users`. Rather
// than pull in a full migration framework for two nullable columns, we
// check for them at startup and add them if missing — safe to run every
// time the server boots, on a brand-new database or an existing one.
//
// Note `role` above also lost its CHECK ('donor','ngo') constraint
// entirely (rather than widening it to include 'admin') — SQLite can't
// alter a CHECK constraint in place without rebuilding the whole table,
// so for an enum that's expected to grow, validating it at the
// application layer (see validation/schemas.js, which already runs on
// every request) is the more maintainable choice than fighting SQLite's
// DDL limitations every time a new role is added.
const userColumns = rawDb.prepare('PRAGMA table_info(users)').all();
const existingColumnNames = userColumns.map((c) => c.name);
if (!existingColumnNames.includes('lat')) {
  rawDb.exec('ALTER TABLE users ADD COLUMN lat REAL');
}
if (!existingColumnNames.includes('lng')) {
  rawDb.exec('ALTER TABLE users ADD COLUMN lng REAL');
}

// The proxy callback Drizzle calls for every query it builds. node:sqlite is
// synchronous, so we just resolve immediately — the `async` signature is
// what Drizzle's proxy driver requires, not a real network round-trip.
//
// IMPORTANT: Drizzle's SQLite query compiler does not alias selected columns
// (it relies on positional access, the way better-sqlite3's `.raw()` mode
// works). node:sqlite returns named objects by default, which silently
// collapses joined queries that select two same-named columns (e.g.
// medicines.name and users.name both becoming "name"). `setReturnArrays(true)`
// makes the statement return plain positional arrays instead, which is what
// Drizzle's proxy driver actually expects.
async function proxyCallback(sql, params, method) {
  const stmt = rawDb.prepare(sql);
  if (method === 'run') {
    const result = stmt.run(...params);
    return { rows: [], insertId: result.lastInsertRowid, changes: result.changes };
  }
  stmt.setReturnArrays(true);
  const rows = stmt.all(...params);
  return { rows };
}

export const db = drizzle(proxyCallback, { schema });

// Manual transaction helper. Drizzle's proxy driver doesn't manage
// BEGIN/COMMIT for us the way a native driver would, so routes that need
// atomicity (e.g. "claim a medicine" = update medicine + insert claim) wrap
// their raw statements in this instead of using db.transaction().
export function withTransaction(fn) {
  rawDb.exec('BEGIN');
  try {
    const result = fn();
    rawDb.exec('COMMIT');
    return result;
  } catch (err) {
    rawDb.exec('ROLLBACK');
    throw err;
  }
}

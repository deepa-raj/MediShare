// db/schema.js — Drizzle ORM table definitions.
// This is the single source of truth for the data model: column types,
// defaults, and foreign keys are declared here once and used both for
// query building (server/routes/*) and for type-safe inserts/selects.
import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  // 'admin' is intentionally not reachable through the public registration
  // form (see validation/schemas.js) — admin accounts are created directly
  // via the seed script, the same way most real systems don't let you
  // self-serve elevated access.
  role: text('role', { enum: ['donor', 'ngo', 'admin'] }).notNull(),
  orgName: text('org_name'),
  city: text('city').notNull(),
  phone: text('phone'),
  // Captured via the browser's Geolocation API at registration, on a
  // best-effort basis — both nullable because a user can decline the
  // location permission prompt and still use the app (just without
  // distance-based sorting).
  lat: real('lat'),
  lng: real('lng'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const medicines = sqliteTable('medicines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  donorId: integer('donor_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category').notNull(),
  quantity: integer('quantity').notNull(),
  unit: text('unit').notNull().default('strips'),
  expiryDate: text('expiry_date').notNull(),
  description: text('description'),
  city: text('city').notNull(),
  status: text('status', { enum: ['available', 'claimed', 'completed', 'cancelled'] })
    .notNull()
    .default('available'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const claims = sqliteTable('claims', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  medicineId: integer('medicine_id').notNull().references(() => medicines.id, { onDelete: 'cascade' }),
  ngoId: integer('ngo_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['pending', 'approved', 'completed', 'declined'] })
    .notNull()
    .default('pending'),
  note: text('note'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', {
    enum: ['claim_received', 'handover_confirmed', 'nearby_listing'],
  }).notNull(),
  message: text('message').notNull(),
  // Relative frontend path the notification should link to when clicked,
  // e.g. "/donor" or "/ngo" — kept generic rather than a medicine ID so the
  // notification stays meaningful even if that listing is later removed.
  link: text('link'),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// utils/notify.js — small helper for inserting notifications from other
// routes. Kept separate from routes/notifications.js (which only handles
// *reading* a user's own notifications) so the "who gets notified, and
// when" logic lives next to the actions that trigger it, while the
// mechanics of "how to write one row" live in one place.
import { db } from '../db/client.js';
import { notifications } from '../db/schema.js';

export async function notify(userId, type, message, link = null) {
  await db.insert(notifications).values({ userId, type, message, link });
}

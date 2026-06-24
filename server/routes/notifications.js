// routes/notifications.js — reading and acknowledging a user's own
// in-app notifications. Creating notifications happens from other routes
// (see utils/notify.js) at the point an event worth notifying about
// actually occurs — a claim, a handover, a nearby new listing.
import express from 'express';
import { eq, and, desc, count } from 'drizzle-orm';
import { db } from '../db/client.js';
import { notifications } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * @openapi
 * /notifications:
 *   get:
 *     summary: List the current user's notifications, most recent first
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Notifications and unread count
 */
router.get('/', requireAuth, async (req, res) => {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, req.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  const [{ n: unreadCount }] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, req.user.id), eq(notifications.isRead, false)));

  res.json({
    unreadCount,
    notifications: rows.map((n) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      link: n.link,
      is_read: n.isRead,
      created_at: n.createdAt,
    })),
  });
});

// PATCH /api/notifications/:id/read — mark a single notification read
router.patch('/:id/read', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
  if (!notification) return res.status(404).json({ error: 'Notification not found.' });
  if (notification.userId !== req.user.id) return res.status(403).json({ error: 'Not your notification.' });

  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  res.json({ message: 'Marked as read.' });
});

// PATCH /api/notifications/read-all — mark everything read for this user
router.patch('/read-all', requireAuth, async (req, res) => {
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, req.user.id));
  res.json({ message: 'All notifications marked as read.' });
});

export default router;

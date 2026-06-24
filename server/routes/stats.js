// routes/stats.js — impact numbers shown on dashboards
import express from 'express';
import { eq, and, ne, count } from 'drizzle-orm';
import { db } from '../db/client.js';
import { medicines, users, claims } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

async function countWhere(table, condition) {
  const [row] = await db.select({ n: count() }).from(table).where(condition);
  return row.n;
}

/**
 * @openapi
 * /stats/platform:
 *   get:
 *     summary: Public, aggregate platform impact numbers
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Platform-wide stats
 */
router.get('/platform', async (req, res) => {
  const [totalDonated, totalCompleted, activeListings, donors, ngos] = await Promise.all([
    countWhere(medicines, ne(medicines.status, 'cancelled')),
    countWhere(medicines, eq(medicines.status, 'completed')),
    countWhere(medicines, eq(medicines.status, 'available')),
    countWhere(users, eq(users.role, 'donor')),
    countWhere(users, eq(users.role, 'ngo')),
  ]);
  res.json({ totalDonated, totalCompleted, activeListings, donors, ngos });
});

/**
 * @openapi
 * /stats/mine:
 *   get:
 *     summary: Personalized dashboard stats for the logged-in user
 *     tags: [Stats]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Donor stats (posted/pending/completed) or NGO stats (claimed/completed)
 */
router.get('/mine', requireAuth, async (req, res) => {
  if (req.user.role === 'donor') {
    const [posted, completed, pending] = await Promise.all([
      countWhere(medicines, eq(medicines.donorId, req.user.id)),
      countWhere(medicines, and(eq(medicines.donorId, req.user.id), eq(medicines.status, 'completed'))),
      countWhere(medicines, and(eq(medicines.donorId, req.user.id), eq(medicines.status, 'claimed'))),
    ]);
    return res.json({ posted, completed, pending });
  }

  const [claimed, completed] = await Promise.all([
    countWhere(claims, eq(claims.ngoId, req.user.id)),
    countWhere(claims, and(eq(claims.ngoId, req.user.id), eq(claims.status, 'completed'))),
  ]);
  res.json({ claimed, completed });
});

export default router;

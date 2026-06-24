// routes/admin.js — platform oversight. Admin accounts aren't reachable
// through public registration (see validation/schemas.js) — they're
// created directly via the seed script, the same way most real systems
// don't let you self-serve elevated access.
import express from 'express';
import { eq, desc, count } from 'drizzle-orm';
import { db, rawDb } from '../db/client.js';
import { users, medicines, claims } from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

/**
 * @openapi
 * /admin/overview:
 *   get:
 *     summary: Platform-wide counts for the admin dashboard
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Aggregate counts
 */
router.get('/overview', async (req, res) => {
  async function countAll(table) {
    const [row] = await db.select({ n: count() }).from(table);
    return row.n;
  }
  const [totalUsers, totalDonors, totalNgos, totalMedicines, totalClaims] = await Promise.all([
    countAll(users),
    db.select({ n: count() }).from(users).where(eq(users.role, 'donor')).then((r) => r[0].n),
    db.select({ n: count() }).from(users).where(eq(users.role, 'ngo')).then((r) => r[0].n),
    countAll(medicines),
    countAll(claims),
  ]);
  res.json({ totalUsers, totalDonors, totalNgos, totalMedicines, totalClaims });
});

// GET /api/admin/users — every account on the platform
router.get('/users', async (req, res) => {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      orgName: users.orgName,
      city: users.city,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));
  res.json(rows);
});

// DELETE /api/admin/users/:id — remove an account (cascades to their
// listings/claims via the FK ON DELETE CASCADE already defined in the schema)
router.delete('/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: "You can't remove your own admin account." });

  const [target] = await db.select().from(users).where(eq(users.id, id));
  if (!target) return res.status(404).json({ error: 'User not found.' });

  await db.delete(users).where(eq(users.id, id));
  res.json({ message: 'User removed.' });
});

// GET /api/admin/medicines — every listing regardless of status
router.get('/medicines', async (req, res) => {
  const rows = await db
    .select({
      id: medicines.id,
      name: medicines.name,
      category: medicines.category,
      quantity: medicines.quantity,
      unit: medicines.unit,
      expiryDate: medicines.expiryDate,
      city: medicines.city,
      status: medicines.status,
      createdAt: medicines.createdAt,
      donorName: users.name,
      donorEmail: users.email,
    })
    .from(medicines)
    .innerJoin(users, eq(medicines.donorId, users.id))
    .orderBy(desc(medicines.createdAt));

  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      quantity: r.quantity,
      unit: r.unit,
      expiry_date: r.expiryDate,
      city: r.city,
      status: r.status,
      created_at: r.createdAt,
      donor_name: r.donorName,
      donor_email: r.donorEmail,
    }))
  );
});

// DELETE /api/admin/medicines/:id — remove a listing (e.g. spam, abuse,
// incorrect info) — cascades to any associated claims
router.delete('/medicines/:id', async (req, res) => {
  const id = Number(req.params.id);
  const [medicine] = await db.select().from(medicines).where(eq(medicines.id, id));
  if (!medicine) return res.status(404).json({ error: 'Listing not found.' });

  await db.delete(medicines).where(eq(medicines.id, id));
  res.json({ message: 'Listing removed.' });
});

// GET /api/admin/claims — every claim on the platform
router.get('/claims', async (req, res) => {
  const rows = await rawDb
    .prepare(
      `SELECT c.id, c.status, c.created_at, m.name AS medicine_name,
              donor.name AS donor_name, ngo.name AS ngo_name
       FROM claims c
       JOIN medicines m ON m.id = c.medicine_id
       JOIN users donor ON donor.id = m.donor_id
       JOIN users ngo ON ngo.id = c.ngo_id
       ORDER BY c.created_at DESC`
    )
    .all();
  res.json(rows);
});

export default router;

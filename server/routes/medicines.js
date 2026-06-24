// routes/medicines.js — listing, browsing, and lifecycle management for donated medicines
import express from 'express';
import { eq, and, like, asc, desc, sql as rawSql } from 'drizzle-orm';
import { db, rawDb } from '../db/client.js';
import { medicines, users, claims } from '../db/schema.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { validate, createMedicineSchema, claimSchema } from '../validation/schemas.js';
import { haversineDistanceKm } from '../utils/geo.js';
import { notify } from '../utils/notify.js';

const router = express.Router();
const DAY_MS = 1000 * 60 * 60 * 24;
// Donors within this radius of a new listing get a "nearby listing" nudge.
// Wide enough to be useful in a country where "same city" can still mean
// 30+ km between two points; narrow enough that it doesn't become noise.
const NEARBY_RADIUS_KM = 50;

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr) - today) / DAY_MS);
}

// Adds the computed days_left / urgency fields the UI's expiry bar reads,
// and maps the Drizzle (camelCase) row shape to the API's snake_case
// contract — keeping the internal data model decoupled from the public
// response shape is deliberate, not an oversight.
function toApiShape(row) {
  const days_left = daysUntil(row.expiryDate);
  let urgency = 'fresh';
  if (days_left < 0) urgency = 'expired';
  else if (days_left <= 7) urgency = 'critical';
  else if (days_left <= 30) urgency = 'soon';

  return {
    id: row.id,
    donor_id: row.donorId,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    expiry_date: row.expiryDate,
    description: row.description,
    city: row.city,
    status: row.status,
    created_at: row.createdAt,
    donor_name: row.donorName,
    donor_city: row.donorCity,
    claim_count: row.claimCount,
    distance_km: row.distanceKm,
    days_left,
    urgency,
  };
}

// Drizzle's sqlite-proxy driver doesn't manage BEGIN/COMMIT itself (see
// db/client.js for why), so multi-statement atomic operations — e.g.
// "claim a medicine" = update medicine status + insert claim record, which
// must succeed or fail together — go through node:sqlite's own
// transaction control directly.
async function withRawTransaction(fn) {
  rawDb.exec('BEGIN');
  try {
    await fn();
    rawDb.exec('COMMIT');
  } catch (err) {
    rawDb.exec('ROLLBACK');
    throw err;
  }
}

/**
 * @openapi
 * /medicines:
 *   get:
 *     summary: Browse available medicine listings
 *     tags: [Medicines]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, default: available }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [expiry, distance], default: expiry }
 *         description: Sort by soonest-expiring (default) or nearest-first. Distance sort only applies when the requester is a logged-in NGO with a saved location.
 *     responses:
 *       200:
 *         description: List of medicines matching the filters
 */
router.get('/', optionalAuth, async (req, res) => {
  const { city, category, search, status = 'available', sort = 'expiry' } = req.query;

  const conditions = [eq(medicines.status, status)];
  if (city) conditions.push(eq(medicines.city, city));
  if (category) conditions.push(eq(medicines.category, category));
  if (search) conditions.push(like(medicines.name, `%${search}%`));

  const rows = await db
    .select({
      id: medicines.id,
      donorId: medicines.donorId,
      name: medicines.name,
      category: medicines.category,
      quantity: medicines.quantity,
      unit: medicines.unit,
      expiryDate: medicines.expiryDate,
      description: medicines.description,
      city: medicines.city,
      status: medicines.status,
      createdAt: medicines.createdAt,
      donorName: users.name,
      donorCity: users.city,
      donorLat: users.lat,
      donorLng: users.lng,
    })
    .from(medicines)
    .innerJoin(users, eq(medicines.donorId, users.id))
    .where(and(...conditions))
    .orderBy(asc(medicines.expiryDate));

  // If the requester is a logged-in NGO with a saved location, attach how
  // far each listing's donor is — lets the frontend show "3.2 km away" and
  // offer a "nearest first" sort. Computed in JS rather than in SQL: this
  // result set is small (a city's worth of open listings), and SQLite has
  // no built-in trig functions, so doing it in SQL would mean a much
  // uglier query for no real performance benefit at this scale.
  let requesterLocation = null;
  if (req.user?.role === 'ngo') {
    const [requester] = await db.select({ lat: users.lat, lng: users.lng }).from(users).where(eq(users.id, req.user.id));
    if (requester?.lat != null && requester?.lng != null) requesterLocation = requester;
  }

  let shaped = rows.map((row) => {
    const distanceKm =
      requesterLocation && row.donorLat != null && row.donorLng != null
        ? Math.round(haversineDistanceKm(requesterLocation.lat, requesterLocation.lng, row.donorLat, row.donorLng) * 10) / 10
        : null;
    return toApiShape({ ...row, distanceKm });
  });

  shaped = shaped.filter((m) => status !== 'available' || m.urgency !== 'expired');

  if (sort === 'distance' && requesterLocation) {
    shaped.sort((a, b) => {
      if (a.distance_km == null) return 1;
      if (b.distance_km == null) return -1;
      return a.distance_km - b.distance_km;
    });
  }

  res.json(shaped);
});

// GET /api/medicines/cities — distinct list of cities with active listings, for the filter dropdown
router.get('/cities', async (req, res) => {
  const rows = await db
    .select({ city: medicines.city })
    .from(medicines)
    .where(eq(medicines.status, 'available'))
    .groupBy(medicines.city)
    .orderBy(asc(medicines.city));
  res.json(rows.map((r) => r.city));
});

// GET /api/medicines/mine — listings created by the logged-in donor
router.get('/mine', requireAuth, requireRole('donor'), async (req, res) => {
  const rows = await db
    .select({
      id: medicines.id,
      donorId: medicines.donorId,
      name: medicines.name,
      category: medicines.category,
      quantity: medicines.quantity,
      unit: medicines.unit,
      expiryDate: medicines.expiryDate,
      description: medicines.description,
      city: medicines.city,
      status: medicines.status,
      createdAt: medicines.createdAt,
      claimCount: rawSql`(SELECT COUNT(*) FROM claims WHERE claims.medicine_id = medicines.id AND claims.status != 'declined')`,
    })
    .from(medicines)
    .where(eq(medicines.donorId, req.user.id))
    .orderBy(desc(medicines.createdAt));

  // A donor whose medicine was claimed has no way to act on "reach out to
  // arrange handover" without actually being given someone to reach out
  // to — so for any claimed/completed listing, attach who claimed it and
  // how to contact them, in one extra query rather than per-row.
  const claimedIds = rows.filter((r) => r.status === 'claimed' || r.status === 'completed').map((r) => r.id);
  let claimantByMedicineId = {};
  if (claimedIds.length > 0) {
    const claimants = await rawDb
      .prepare(
        `SELECT c.medicine_id, u.name, u.org_name, u.email, u.phone
         FROM claims c
         JOIN users u ON u.id = c.ngo_id
         WHERE c.medicine_id IN (${claimedIds.map(() => '?').join(',')})
           AND c.status != 'declined'`
      )
      .all(...claimedIds);
    claimantByMedicineId = Object.fromEntries(
      claimants.map((c) => [
        c.medicine_id,
        { name: c.org_name || c.name, contact_name: c.name, email: c.email, phone: c.phone },
      ])
    );
  }

  res.json(
    rows.map((row) => ({
      ...toApiShape(row),
      claimed_by: claimantByMedicineId[row.id] || null,
    }))
  );
});

/**
 * @openapi
 * /medicines:
 *   post:
 *     summary: Create a new medicine listing (donor only)
 *     tags: [Medicines]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMedicineInput'
 *     responses:
 *       201:
 *         description: Listing created
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not a donor account
 */
router.post('/', requireAuth, requireRole('donor'), validate(createMedicineSchema), async (req, res) => {
  const { name, category, quantity, unit, expiry_date, description, city } = req.body;

  const [created] = await db
    .insert(medicines)
    .values({
      donorId: req.user.id,
      name,
      category,
      quantity,
      unit: unit || 'strips',
      expiryDate: expiry_date,
      description: description || null,
      city,
    })
    .returning();

  // Best-effort: if the donor never shared a location, or no NGO has one
  // saved either, this silently does nothing. A failure here (e.g. a
  // transient DB error while writing notifications) should never block
  // the listing itself from being created — the listing is the important
  // part, the nudge is a nice-to-have.
  try {
    await notifyNearbyNgos(created);
  } catch (err) {
    console.error('Failed to notify nearby NGOs:', err);
  }

  res.status(201).json(toApiShape(created));
});

async function notifyNearbyNgos(medicine) {
  const [donor] = await db.select({ lat: users.lat, lng: users.lng }).from(users).where(eq(users.id, medicine.donorId));
  if (donor?.lat == null || donor?.lng == null) return;

  const ngos = await db
    .select({ id: users.id, lat: users.lat, lng: users.lng })
    .from(users)
    .where(eq(users.role, 'ngo'));

  const nearby = ngos.filter(
    (ngo) => ngo.lat != null && ngo.lng != null && haversineDistanceKm(donor.lat, donor.lng, ngo.lat, ngo.lng) <= NEARBY_RADIUS_KM
  );

  await Promise.all(
    nearby.map((ngo) =>
      notify(ngo.id, 'nearby_listing', `New medicine available near you: ${medicine.name} in ${medicine.city}.`, '/')
    )
  );
}

// PATCH /api/medicines/:id/cancel — donor withdraws an unclaimed listing
router.patch('/:id/cancel', requireAuth, requireRole('donor'), async (req, res) => {
  const id = Number(req.params.id);
  const [medicine] = await db.select().from(medicines).where(eq(medicines.id, id));
  if (!medicine) return res.status(404).json({ error: 'Listing not found.' });
  if (medicine.donorId !== req.user.id) return res.status(403).json({ error: 'You can only manage your own listings.' });
  if (medicine.status !== 'available') return res.status(400).json({ error: 'Only available listings can be cancelled.' });

  await db.update(medicines).set({ status: 'cancelled' }).where(eq(medicines.id, id));
  res.json({ message: 'Listing cancelled.' });
});

/**
 * @openapi
 * /medicines/{id}/claim:
 *   post:
 *     summary: Claim a medicine listing (NGO only)
 *     tags: [Medicines]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Claim submitted
 *       400:
 *         description: Listing not available or already expired
 *       403:
 *         description: Not an NGO account
 *       404:
 *         description: Listing not found
 */
router.post('/:id/claim', requireAuth, requireRole('ngo'), validate(claimSchema), async (req, res) => {
  const id = Number(req.params.id);
  const [medicine] = await db.select().from(medicines).where(eq(medicines.id, id));
  if (!medicine) return res.status(404).json({ error: 'Listing not found.' });
  if (medicine.status !== 'available') return res.status(400).json({ error: 'This medicine is no longer available.' });
  if (daysUntil(medicine.expiryDate) < 0) return res.status(400).json({ error: 'This medicine has expired.' });

  await withRawTransaction(async () => {
    await db.update(medicines).set({ status: 'claimed' }).where(eq(medicines.id, id));
    await db.insert(claims).values({ medicineId: id, ngoId: req.user.id, note: req.body.note || null });
  });

  await notify(
    medicine.donorId,
    'claim_received',
    `${req.user.name} claimed your ${medicine.name}. Reach out to arrange handover.`,
    '/donor'
  );

  res.json({ message: 'Claim submitted. The donor will be notified to arrange handover.' });
});

// PATCH /api/medicines/:id/complete — donor confirms handover happened
router.patch('/:id/complete', requireAuth, requireRole('donor'), async (req, res) => {
  const id = Number(req.params.id);
  const [medicine] = await db.select().from(medicines).where(eq(medicines.id, id));
  if (!medicine) return res.status(404).json({ error: 'Listing not found.' });
  if (medicine.donorId !== req.user.id) return res.status(403).json({ error: 'You can only manage your own listings.' });
  if (medicine.status !== 'claimed') return res.status(400).json({ error: 'Only claimed listings can be marked complete.' });

  const [activeClaim] = await db
    .select()
    .from(claims)
    .where(and(eq(claims.medicineId, id), eq(claims.status, 'pending')));

  await withRawTransaction(async () => {
    await db.update(medicines).set({ status: 'completed' }).where(eq(medicines.id, id));
    await db.update(claims).set({ status: 'completed' }).where(and(eq(claims.medicineId, id), eq(claims.status, 'pending')));
  });

  if (activeClaim) {
    await notify(
      activeClaim.ngoId,
      'handover_confirmed',
      `Your claim for ${medicine.name} was marked as handed over.`,
      '/ngo'
    );
  }

  res.json({ message: 'Marked as handed over. Thank you for donating.' });
});

// GET /api/medicines/claims/mine — NGO's claim history
router.get('/claims/mine', requireAuth, requireRole('ngo'), async (req, res) => {
  const rows = await db
    .select({
      id: claims.id,
      status: claims.status,
      createdAt: claims.createdAt,
      name: medicines.name,
      category: medicines.category,
      quantity: medicines.quantity,
      unit: medicines.unit,
      expiryDate: medicines.expiryDate,
      city: medicines.city,
      donorName: users.name,
      donorPhone: users.phone,
      donorEmail: users.email,
    })
    .from(claims)
    .innerJoin(medicines, eq(claims.medicineId, medicines.id))
    .innerJoin(users, eq(medicines.donorId, users.id))
    .where(eq(claims.ngoId, req.user.id))
    .orderBy(desc(claims.createdAt));

  res.json(
    rows.map((r) => ({
      id: r.id,
      status: r.status,
      created_at: r.createdAt,
      name: r.name,
      category: r.category,
      quantity: r.quantity,
      unit: r.unit,
      expiry_date: r.expiryDate,
      city: r.city,
      donor_name: r.donorName,
      donor_phone: r.donorPhone,
      donor_email: r.donorEmail,
      days_left: daysUntil(r.expiryDate),
    }))
  );
});

export default router;

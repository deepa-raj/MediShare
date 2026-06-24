// routes/auth.js — registration and login for donors and NGOs
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { JWT_SECRET } from '../middleware/auth.js';
import { validate, registerSchema, loginSchema } from '../validation/schemas.js';

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
}

function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Create a donor or NGO account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *     responses:
 *       201:
 *         description: Account created
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already registered
 */
router.post('/register', validate(registerSchema), async (req, res) => {
  const { name, email, password, role, org_name, city, phone, lat, lng } = req.body;

  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash,
      role,
      orgName: org_name || null,
      city,
      phone: phone || null,
      lat: lat ?? null,
      lng: lng ?? null,
    })
    .returning();

  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Incorrect email or password
 */
router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Validate the current session token
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Current user
 *       401:
 *         description: Invalid or missing token
 */
router.get('/me', async (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'No token.' });

  try {
    const payload = jwt.verify(header.split(' ')[1], JWT_SECRET);
    const [user] = await db.select().from(users).where(eq(users.id, payload.id));
    if (!user) return res.status(401).json({ error: 'User no longer exists.' });
    res.json({ user: publicUser(user) });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
});

export default router;

// validation/schemas.js — single source of truth for request-body shape.
// Centralizing these means a route handler never has to hand-check
// `if (!name) return res.status(400)...` — the schema does it, with
// consistent, field-level error messages.
import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(100),
    email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
    password: z.string().min(6, 'Password must be at least 6 characters.').max(72),
    role: z.enum(['donor', 'ngo'], { errorMap: () => ({ message: 'Role must be "donor" or "ngo".' }) }),
    // An empty string from a form field that simply wasn't shown (donor
    // accounts never see this field) is "not provided," not "an invalid
    // 0-character name" — without this preprocessing, an empty string
    // passed .optional()'s "is it present" check but then failed min(2).
    org_name: z.preprocess(
      (val) => (val === '' ? undefined : val),
      z.string().trim().min(2).max(150).optional()
    ),
    city: z.string().trim().min(2, 'City is required.').max(100),
    phone: z.string().trim().max(20).optional(),
    // Captured via the browser's Geolocation API on the frontend. Coerced
    // through the same "empty string means absent" preprocessing as
    // org_name, since the field is sent as '' when the browser permission
    // prompt was declined or geolocation isn't supported.
    lat: z.preprocess((val) => (val === '' || val === undefined ? undefined : val), z.coerce.number().min(-90).max(90).optional()),
    lng: z.preprocess((val) => (val === '' || val === undefined ? undefined : val), z.coerce.number().min(-180).max(180).optional()),
  })
  .refine((data) => data.role !== 'ngo' || !!data.org_name, {
    message: 'Organization name is required for NGO/clinic accounts.',
    path: ['org_name'],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export const createMedicineSchema = z.object({
  name: z.string().trim().min(2, 'Medicine name is required.').max(150),
  category: z.string().trim().min(2, 'Category is required.').max(50),
  quantity: z.coerce.number().int().positive('Quantity must be greater than zero.'),
  unit: z.string().trim().max(20).optional(),
  expiry_date: z
    .string()
    .refine((val) => !Number.isNaN(Date.parse(val)), { message: 'Enter a valid expiry date.' })
    .refine((val) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(val) >= today;
    }, { message: 'This medicine has already expired and cannot be listed.' }),
  description: z.string().trim().max(500).optional(),
  city: z.string().trim().min(2, 'City is required.').max(100),
});

export const claimSchema = z.object({
  note: z.string().trim().max(300).optional(),
});

// Express middleware factory: validates req.body against `schema`,
// replaces req.body with the parsed (and coerced/trimmed) result on
// success, or responds 400 with field-level messages on failure.
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      }));
      return res.status(400).json({ error: errors[0].message, errors });
    }
    req.body = result.data;
    next();
  };
}

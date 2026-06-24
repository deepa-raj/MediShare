// middleware/auth.js — verifies JWT and attaches user info to the request
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'medishare-dev-secret-change-in-production';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, role, name }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: `This action requires a ${role} account.` });
    }
    next();
  };
}

// For routes that are public but behave better when they know who's
// asking — e.g. the browse feed is open to everyone, but can sort by
// distance if the requester happens to be a logged-in NGO with a saved
// location. Never rejects the request; a missing or invalid token just
// means req.user stays undefined, same as an anonymous visitor.
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();

  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
  } catch {
    // Invalid/expired token on a route that doesn't require one — ignore
    // and continue as anonymous rather than erroring.
  }
  next();
}

export { JWT_SECRET };

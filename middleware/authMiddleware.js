/**
 * middleware/authMiddleware.js – JWT Authentication + Role-Based Access Control (RBAC)
 *
 * KEY CONCEPT – Middleware
 * Middleware is a function that sits between the incoming request and your
 * route handler.  Express calls middleware in the ORDER they are listed:
 *
 *   router.post('/slots', authenticateToken, requireRole('ADMIN'), createSlot);
 *                          ^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^
 *                          middleware #1     middleware #2         handler
 *
 * If middleware calls next(), Express moves to the next function in the chain.
 * If middleware sends a response (res.json/res.status), the chain STOPS.
 *
 * KEY CONCEPT – JWT (JSON Web Token)
 * A JWT is a compact string with 3 parts separated by dots:
 *   header.payload.signature
 *
 * The server creates a JWT on login (jwt.sign).
 * The client sends the JWT with every request in the Authorization header:
 *   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
 *
 * The server verifies the JWT (jwt.verify) to confirm the user is authentic
 * and has not tampered with the token.
 *
 * KEY CONCEPT – RBAC (Role-Based Access Control)
 * Each user has a role (STUDENT, ADMIN, SUPER_ADMIN).
 * requireRole() checks if the user's role is in the allowed list.
 * This way, students can't access admin-only endpoints.
 */
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

/**
 * authenticateToken – verifies Bearer JWT; attaches decoded payload to req.user.
 */
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = decoded;
    next();
  });
};

/**
 * requireRole(...roles) – factory that returns a middleware allowing only
 * users whose role is in the given list.
 *
 * Usage:
 *   router.post('/slots', authenticateToken, requireRole('ADMIN','SUPER_ADMIN'), handler);
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: `Access restricted to: ${roles.join(', ')}.` });
  }
  next();
};

module.exports = authenticateToken;
module.exports.requireRole = requireRole;

/**
 * middleware/authMiddleware.js – JWT Authentication + RBAC Guards
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

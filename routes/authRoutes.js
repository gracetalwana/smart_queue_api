/**
 * routes/authRoutes.js – Public authentication routes
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const {
    register, login, refresh, logout, forgotPassword, resetPassword,
} = require('../controllers/authController');

const router = express.Router();

// Strict rate limiter: max 10 login attempts per 15 min per IP
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// ── Routes ────────────────────────────────────────────────────────────────────
router.post('/auth/register', register);
router.post('/auth/login', loginLimiter, login);
router.post('/auth/refresh', refresh);
router.post('/auth/logout', logout);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password', resetPassword);

// ── Backwards-compat aliases (keep old routes working) ──────────────────────
router.post('/register', register);
router.post('/login', loginLimiter, login);

module.exports = router;

/**
 * controllers/authController.js – Authentication Controller
 *
 * This controller handles everything related to user authentication:
 * registering, logging in, refreshing tokens, and resetting passwords.
 *
 * KEY CONCEPT – Password Hashing (bcrypt)
 * We NEVER store plain-text passwords.  bcrypt.hash() turns "Admin@1234"
 * into "$2b$10$xK..." (a one-way hash).  On login, bcrypt.compare()
 * checks if the entered password matches the stored hash.
 *
 * KEY CONCEPT – Access + Refresh Tokens
 * - Access token:  short-lived (15 min).  Sent with every API request.
 * - Refresh token: long-lived (7 days).  Used ONLY to get a new access token.
 * Why two tokens?  If an access token is stolen, it expires quickly.
 * The refresh token is used less frequently and can be revoked.
 *
 * Endpoints:
 *   POST /api/register       – student self-registration
 *   POST /api/login          – login → access + refresh tokens
 *   POST /api/refresh-token  – swap refresh token for new access token
 *   POST /api/logout         – invalidate refresh token
 *   POST /api/forgot-password – send OTP to email
 *   POST /api/reset-password  – verify OTP + set new password
 */
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const dotenv = require('dotenv');
const notificationService = require('../services/notificationService');

dotenv.config();

const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

function signAccess(payload) { return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRY }); }
function signRefresh(payload) { return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: REFRESH_EXPIRY }); }

// ── POST /api/auth/register ───────────────────────────────────────────────────
const register = async (req, res) => {
  const { username, password, email, full_name, phone_number } = req.body;
  if (!username || !password || !email) {
    return res.status(400).json({ error: 'username, password and email are required.' });
  }
  try {
    await User.create(username, password, email, full_name || null, 'STUDENT', phone_number || null);
    res.status(201).json({ message: 'Registered successfully. Please log in.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Username or email already in use.' });
    res.status(500).json({ error: err.message });
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password are required.' });

  try {
    const [results] = await User.findByUsername(username);
    if (!results.length) return res.status(401).json({ error: 'Invalid credentials.' });

    const user = results[0];
    if (!user.is_active) return res.status(403).json({ error: 'Account is deactivated.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

    const payload = { id: user.id, username: user.username, role: user.role };
    const accessToken = signAccess(payload);
    const refreshToken = signRefresh(payload);

    // Store hashed refresh token
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await User.setRefreshToken(user.id, tokenHash);

    res.json({
      token: accessToken,          // ← kept as 'token' for frontend backwards compatibility
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, full_name: user.full_name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required.' });

  try {
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const [rows] = await User.findByRefreshToken(tokenHash);
    if (!rows.length) return res.status(403).json({ error: 'Refresh token invalid or expired.' });

    const user = rows[0];
    const payload = { id: user.id, username: user.username, role: user.role };
    const newAccess = signAccess(payload);
    const newRefresh = signRefresh(payload);
    const newHash = crypto.createHash('sha256').update(newRefresh).digest('hex');
    await User.setRefreshToken(user.id, newHash);

    res.json({ accessToken: newAccess, token: newAccess, refreshToken: newRefresh });
  } catch {
    res.status(403).json({ error: 'Invalid refresh token.' });
  }
};

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
const logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const [rows] = await User.findByRefreshToken(tokenHash).catch(() => [[]]);
    if (rows.length) await User.clearRefreshToken(rows[0].id);
  }
  res.json({ message: 'Logged out.' });
};

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required.' });

  try {
    const [rows] = await User.findByEmail(email);
    // Always return 200 to avoid user-enumeration
    if (!rows.length) return res.json({ message: 'If that email exists, an OTP has been sent.' });

    const user = rows[0];
    const otp = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await User.setOtp(user.id, otp, expiresAt);
    await notificationService.sendEmail(
      email,
      'UCU Password Reset OTP',
      `<p>Your one-time password reset code is: <strong>${otp}</strong></p><p>It expires in 15 minutes.</p>`
    ).catch(console.error);

    res.json({ message: 'If that email exists, an OTP has been sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── POST /api/auth/reset-password ────────────────────────────────────────────
const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'email, otp, and newPassword are required.' });
  }

  try {
    const [rows] = await User.findByEmail(email);
    if (!rows.length) return res.status(400).json({ error: 'Invalid OTP or email.' });

    const user = rows[0];
    if (!user.otp_code || user.otp_code !== otp) {
      return res.status(400).json({ error: 'Invalid OTP.' });
    }
    if (new Date() > new Date(user.otp_expires)) {
      return res.status(400).json({ error: 'OTP has expired.' });
    }

    await User.updatePassword(user.id, newPassword);
    await User.clearOtp(user.id);

    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { register, login, refresh, logout, forgotPassword, resetPassword };

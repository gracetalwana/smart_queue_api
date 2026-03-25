/**
 * models/userModel.js – Data Access Layer for Users (extended for Smart Queue)
 */
const db = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
  /** Create a new user (student registration). */
  create: async (username, password, email, fullName = null, role = 'STUDENT', phone = null) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = `INSERT INTO users (username, full_name, email, password, role, phone_number)
                 VALUES (?, ?, ?, ?, ?, ?)`;
    return db.query(sql, [username, fullName, email, hashedPassword, role, phone]);
  },

  /** Look up a user by username (used during login). */
  findByUsername: (username) =>
    db.query('SELECT * FROM users WHERE username = ?', [username]),

  /** Look up a user by email (used for OTP reset). */
  findByEmail: (email) =>
    db.query('SELECT * FROM users WHERE email = ?', [email]),

  /** Find a user by primary key (no password). */
  findById: (id) =>
    db.query(
      'SELECT id, username, full_name, email, role, phone_number, is_active, created_at FROM users WHERE id = ?',
      [id]
    ),

  /** Return all users (no passwords). */
  getAll: () =>
    db.query(
      'SELECT id, username, full_name, email, role, phone_number, is_active, created_at FROM users'
    ),

  /** Update profile fields (username, full_name, email, phone_number). */
  update: (id, { username, fullName, email, phone }) => {
    const sql = `UPDATE users SET username = ?, full_name = ?, email = ?, phone_number = ? WHERE id = ?`;
    return db.query(sql, [username, fullName, email, phone, id]);
  },

  /** Hard delete (admin-only; cascades user_chapters). */
  delete: (id) => db.query('DELETE FROM users WHERE id = ?', [id]),

  /** Save refresh token hash. */
  setRefreshToken: (id, tokenHash) =>
    db.query('UPDATE users SET refresh_token = ? WHERE id = ?', [tokenHash, id]),

  /** Clear refresh token on logout. */
  clearRefreshToken: (id) =>
    db.query('UPDATE users SET refresh_token = NULL WHERE id = ?', [id]),

  /** Find user by refresh token hash. */
  findByRefreshToken: (tokenHash) =>
    db.query('SELECT * FROM users WHERE refresh_token = ?', [tokenHash]),

  /** Store OTP code + expiry for password reset. */
  setOtp: (id, otp, expiresAt) =>
    db.query('UPDATE users SET otp_code = ?, otp_expires = ? WHERE id = ?', [otp, expiresAt, id]),

  /** Clear OTP after use. */
  clearOtp: (id) =>
    db.query('UPDATE users SET otp_code = NULL, otp_expires = NULL WHERE id = ?', [id]),

  /** Update password hash (after OTP reset). */
  updatePassword: async (id, newPassword) => {
    const hash = await bcrypt.hash(newPassword, 10);
    return db.query('UPDATE users SET password = ? WHERE id = ?', [hash, id]);
  },
};

module.exports = User;

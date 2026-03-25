/**
 * controllers/userController.js – User Management Controller (extended)
 */
const User = require('../models/userModel');

/** GET /api/users – list all users (admin only). */
const getAllUsers = async (req, res) => {
  try {
    const [users] = await User.getAll();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** GET /api/users/me – return own profile from JWT. */
const getMyProfile = async (req, res) => {
  try {
    const [rows] = await User.findById(req.user.id);
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** GET /api/users/:id */
const getUserById = async (req, res) => {
  try {
    const [results] = await User.findById(req.params.id);
    if (!results.length) return res.status(404).json({ error: 'User not found.' });
    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** PUT /api/users/:id – update username, email, full_name, phone_number. */
const updateUser = async (req, res) => {
  const { username, email, full_name, phone_number } = req.body;
  if (!username || !email) return res.status(400).json({ error: 'username and email are required.' });
  try {
    await User.update(req.params.id, { username, fullName: full_name, email, phone: phone_number });
    res.json({ message: 'User updated successfully.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Username or email already in use.' });
    res.status(500).json({ error: err.message });
  }
};

/** DELETE /api/users/:id */
const deleteUser = async (req, res) => {
  try {
    await User.delete(req.params.id);
    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAllUsers, getUserById, getMyProfile, updateUser, deleteUser };

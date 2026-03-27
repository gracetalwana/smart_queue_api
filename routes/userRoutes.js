/**
 * routes/userRoutes.js – User management routes
 */
const express = require('express');
const { getAllUsers, getUserById, getMyProfile, updateUser, deleteUser } = require('../controllers/userController');
const authenticateToken = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/users/me', authenticateToken, getMyProfile);
router.get('/users', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), getAllUsers);
router.get('/users/:id', authenticateToken, getUserById);
router.put('/users/:id', authenticateToken, updateUser);
router.delete('/users/:id', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), deleteUser);

const { getStudentUsageReport } = require('../controllers/userController');

router.get(
  '/reports/student-usage',
  authenticateToken,
  requireRole('ADMIN'),
  getStudentUsageReport
);
module.exports = router;

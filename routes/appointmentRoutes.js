const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');
const {
    bookAppointment, getAppointment, getMyAppointments,
    getAppointmentsBySlot, cancelAppointment,
    markServed, markNoShow, markServing, getStats,
} = require('../controllers/appointmentController');

// Student routes
router.post('/', authenticateToken, bookAppointment);
router.get('/my', authenticateToken, getMyAppointments);
router.patch('/:id/cancel', authenticateToken, cancelAppointment);

// Admin-only routes  (stats must come before :id to avoid matching "stats" as an id)
router.get('/stats', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), getStats);
router.get('/', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), getAppointmentsBySlot);

// Admin + student (ownership check inside controller)
router.get('/:id', authenticateToken, getAppointment);
router.patch('/:id/served', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), markServed);
router.patch('/:id/no-show', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), markNoShow);
router.patch('/:id/serving', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), markServing);

module.exports = router;

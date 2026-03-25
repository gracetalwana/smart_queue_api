const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');
const {
    bookAppointment, getAppointment, getMyAppointments,
    getAppointmentsBySlot, cancelAppointment,
    markServed, markNoShow, markServing,
} = require('../controllers/appointmentController');

// Student routes
router.post('/', authenticateToken, bookAppointment);
router.get('/my', authenticateToken, getMyAppointments);
router.patch('/:id/cancel', authenticateToken, cancelAppointment);

// Admin + student (ownership check inside controller)
router.get('/:id', authenticateToken, getAppointment);

// Admin-only routes
router.get('/', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), getAppointmentsBySlot);
router.patch('/:id/served', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), markServed);
router.patch('/:id/no-show', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), markNoShow);
router.patch('/:id/serving', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), markServing);

module.exports = router;

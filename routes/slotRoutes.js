const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');
const {
    createSlot, getSlots, getAllSlots, getSlotById, updateSlot,
} = require('../controllers/slotController');

// Student: browse available slots (optionally filter by ?date=)
router.get('/', authenticateToken, getSlots);

// Admin+: create / manage slots
router.post('/', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), createSlot);
router.get('/all', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), getAllSlots);
router.get('/:id', authenticateToken, getSlotById);
router.put('/:id', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), updateSlot);

module.exports = router;

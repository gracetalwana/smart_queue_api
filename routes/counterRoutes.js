const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');
const {
    getCounters, createCounter, toggleCounter,
} = require('../controllers/counterController');

router.get('/', authenticateToken, getCounters);
router.post('/', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), createCounter);
router.patch('/:id/toggle', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), toggleCounter);

module.exports = router;

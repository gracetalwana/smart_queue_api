const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');
const {
    getMyNotifications, markRead, markAllRead, broadcast,
} = require('../controllers/notificationController');

router.get('/', authenticateToken, getMyNotifications);
router.patch('/read-all', authenticateToken, markAllRead);
router.patch('/:id/read', authenticateToken, markRead);
router.post('/broadcast', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), broadcast);

module.exports = router;

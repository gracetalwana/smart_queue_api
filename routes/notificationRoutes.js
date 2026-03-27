const express = require('express');
const router = express.Router();

const authenticateToken = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');

const {
    getMyNotifications,
    markRead,
    markAllRead,
    broadcast,
} = require('../controllers/notificationController');

// 🔥 SAFETY CHECK (prevents silent undefined crash)
if (!getMyNotifications || !markRead || !markAllRead || !broadcast) {
    throw new Error(
        'One or more notification controller functions are undefined. Check notificationController exports.'
    );
}

/** GET user notifications */
router.get('/', authenticateToken, getMyNotifications);

/** Mark all notifications as read */
router.patch('/read-all', authenticateToken, markAllRead);

/** Mark single notification as read */
router.patch('/:id/read', authenticateToken, markRead);

/** Admin broadcast notification */
router.post(
    '/broadcast',
    authenticateToken,
    requireRole('ADMIN', 'SUPER_ADMIN'),
    broadcast
);

module.exports = router;
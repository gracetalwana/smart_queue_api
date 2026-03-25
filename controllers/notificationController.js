/**
 * controllers/notificationController.js
 */
const Notification = require('../models/notificationModel');
const notificationService = require('../services/notificationService');

/** GET /api/notifications – current user's notifications. */
const getMyNotifications = async (req, res) => {
    try {
        const [rows] = await Notification.getByUser(req.user.id);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/** PATCH /api/notifications/:id/read */
const markRead = async (req, res) => {
    try {
        await Notification.markRead(req.params.id, req.user.id);
        res.json({ message: 'Notification marked as read.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/** PATCH /api/notifications/read-all */
const markAllRead = async (req, res) => {
    try {
        await Notification.markAllRead(req.user.id);
        res.json({ message: 'All notifications marked as read.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/** POST /api/notifications/broadcast – admin broadcasts a message to all users. */
const broadcast = async (req, res) => {
    const { message } = req.body;
    if (!message || !message.trim()) {
        return res.status(400).json({ error: 'message is required.' });
    }
    try {
        await notificationService.broadcastAdminMessage(req.user.id, message.trim());
        res.json({ message: 'Broadcast sent.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getMyNotifications, markRead, markAllRead, broadcast };

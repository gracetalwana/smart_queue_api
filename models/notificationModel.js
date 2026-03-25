/**
 * models/notificationModel.js – Data Access Layer for Notifications
 */
const db = require('../config/db');

const Notification = {
    /** Create a new notification record. */
    create: (userId, appointmentId, type, channel, message) => {
        const sql = `
      INSERT INTO notifications (user_id, appointment_id, type, channel, message)
      VALUES (?, ?, ?, ?, ?)
    `;
        return db.query(sql, [userId, appointmentId, type, channel, message]);
    },

    /** Get all notifications for a user (newest first). */
    getByUser: (userId) => {
        const sql = `
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
    `;
        return db.query(sql, [userId]);
    },

    /** Mark a single notification as read. */
    markRead: (notificationId) => {
        return db.query(
            'UPDATE notifications SET is_read = 1 WHERE notification_id = ?',
            [notificationId]
        );
    },

    /** Mark all in-app notifications for a user as read. */
    markAllRead: (userId) => {
        return db.query(
            `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND channel = 'IN_APP'`,
            [userId]
        );
    },

    /** Update delivery status (SENT / FAILED) and set sent_at timestamp. */
    updateStatus: (notificationId, status) => {
        return db.query(
            `UPDATE notifications SET status = ?, sent_at = NOW() WHERE notification_id = ?`,
            [status, notificationId]
        );
    },
};

module.exports = Notification;

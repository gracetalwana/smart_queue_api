/**
 * models/notificationModel.js – Data Access Layer for Notifications
 */
const db = require('../config/db');

const Notification = {

    /** Create a new notification record */
    create: (userId, appointmentId, type, channel, message) => {
        const sql = `
            INSERT INTO notifications 
            (user_id, appointment_id, type, channel, message)
            VALUES (?, ?, ?, ?, ?)
        `;
        return db.query(sql, [
            userId,
            appointmentId,
            type,
            channel,
            message
        ]);
    },

    /** Get all notifications for a user (newest first) */
    getByUser: (userId) => {
        const sql = `
            SELECT *
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
        `;
        return db.query(sql, [userId]);
    },

    /** Mark one notification as read */
    markRead: (notificationId) => {
        const sql = `
            UPDATE notifications
            SET is_read = 1
            WHERE notification_id = ?
        `;
        return db.query(sql, [notificationId]);
    },

    /** Mark all notifications as read (IN_APP only) */
    markAllRead: (userId) => {
        const sql = `
            UPDATE notifications
            SET is_read = 1
            WHERE user_id = ?
            AND channel = 'IN_APP'
        `;
        return db.query(sql, [userId]);
    },

    /** Update delivery status */
    updateStatus: (notificationId, status) => {
        const sql = `
            UPDATE notifications
            SET status = ?, sent_at = NOW()
            WHERE notification_id = ?
        `;
        return db.query(sql, [status, notificationId]);
    }
};

module.exports = Notification;
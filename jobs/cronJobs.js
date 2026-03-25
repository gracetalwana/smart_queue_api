/**
 * jobs/cronJobs.js – Scheduled background tasks using node-cron
 *
 * Jobs:
 *  1. Every minute  – mark NO_SHOW for past-due appointments
 *  2. Daily 08:00   – send 24-hour reminder for tomorrow's slots
 *  3. Hourly        – send 1-hour reminder for upcoming slots
 */
const cron = require('node-cron');
const db = require('../config/db');
const Appointment = require('../models/appointmentModel');
const notificationService = require('../services/notificationService');

// ─── 1. Mark NO_SHOW every minute ────────────────────────────────────────────
// Any PENDING or SERVING appointment whose slot ended more than 15 minutes ago
// gets flipped to NO_SHOW automatically.
cron.schedule('* * * * *', async () => {
    try {
        const [slots] = await db.query(
            `SELECT slot_id FROM time_slots
       WHERE is_active = 1
         AND slot_date = CURDATE()
         AND TIMESTAMPDIFF(MINUTE, CONCAT(slot_date,' ',end_time), NOW()) >= 15`
        );
        for (const slot of slots) {
            await Appointment.markNoShows(slot.slot_id);
        }
    } catch (err) {
        console.error('[cron no-show]', err.message);
    }
});

// ─── 2. Daily 08:00 – 24-hour reminder ───────────────────────────────────────
cron.schedule('0 8 * * *', async () => {
    try {
        // Find all PENDING appointments for tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().slice(0, 10);

        const [rows] = await db.query(
            `SELECT a.*, u.email, u.full_name, u.phone_number,
              t.slot_date, t.start_time, t.end_time
       FROM appointments a
       JOIN users u ON u.id = a.student_id
       JOIN time_slots t ON t.slot_id = a.slot_id
       WHERE t.slot_date = ? AND a.status = 'PENDING'`,
            [dateStr]
        );

        for (const row of rows) {
            await notificationService.sendReminder(
                { id: row.student_id, email: row.email, full_name: row.full_name, phone_number: row.phone_number },
                row,
                '24 hours'
            );
        }
        console.log(`[cron 24h-reminder] sent ${rows.length} reminders for ${dateStr}`);
    } catch (err) {
        console.error('[cron 24h-reminder]', err.message);
    }
});

// ─── 3. Hourly – 1-hour reminder ─────────────────────────────────────────────
cron.schedule('0 * * * *', async () => {
    try {
        const [rows] = await db.query(
            `SELECT a.*, u.email, u.full_name, u.phone_number,
              t.slot_date, t.start_time, t.end_time
       FROM appointments a
       JOIN users u ON u.id = a.student_id
       JOIN time_slots t ON t.slot_id = a.slot_id
       WHERE t.slot_date = CURDATE()
         AND a.status = 'PENDING'
         AND TIMESTAMPDIFF(MINUTE, NOW(), CONCAT(t.slot_date,' ',t.start_time)) BETWEEN 55 AND 65`
        );

        for (const row of rows) {
            await notificationService.sendReminder(
                { id: row.student_id, email: row.email, full_name: row.full_name, phone_number: row.phone_number },
                row,
                '1 hour'
            );
        }
        console.log(`[cron 1h-reminder] sent ${rows.length} reminders`);
    } catch (err) {
        console.error('[cron 1h-reminder]', err.message);
    }
});

console.log('[cron] Scheduled jobs initialised.');

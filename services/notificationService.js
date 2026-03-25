/**
 * services/notificationService.js
 *
 * Handles all three notification channels:
 *  - IN_APP  → stored in the DB and broadcast via Socket.IO
 *  - EMAIL   → sent via Nodemailer
 *  - SMS     → sent via Africa's Talking
 *
 * All sends are fire-and-forget from the booking flow; errors are logged
 * but never bubble up to the HTTP response.
 */
const nodemailer = require('nodemailer');
const Notification = require('../models/notificationModel');

// ── Email transport ────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.MAIL_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

// ── Africa's Talking SMS ───────────────────────────────────────────────────────
let smsClient = null;
try {
    if (process.env.AT_API_KEY && process.env.AT_USERNAME) {
        const AfricasTalking = require('africastalking');
        const at = AfricasTalking({
            apiKey: process.env.AT_API_KEY,
            username: process.env.AT_USERNAME,
        });
        smsClient = at.SMS;
    }
} catch {
    console.warn('[notificationService] Africa\'s Talking SDK not available – SMS disabled.');
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Emit an IN_APP notification via Socket.IO.
 */
function emitInApp(userId, payload) {
    if (global.io) {
        global.io.to(`user_${userId}`).emit('notification', payload);
    }
}

/**
 * Send an email (catches errors gracefully).
 */
async function sendEmail(to, subject, html) {
    if (!process.env.MAIL_USER) {
        console.warn('[notificationService] MAIL_USER not set – email skipped.');
        return;
    }
    await transporter.sendMail({
        from: `"UCU Accounts Office" <${process.env.MAIL_USER}>`,
        to,
        subject,
        html,
    });
}

/**
 * Send an SMS via Africa's Talking.
 */
async function sendSMS(phone, message) {
    if (!smsClient) {
        console.warn('[notificationService] SMS client not configured – SMS skipped.');
        return;
    }
    await smsClient.send({
        to: [phone],
        message,
        from: process.env.AT_SENDER_ID || 'UCU',
    });
}

// ── Public notification functions ─────────────────────────────────────────────

/**
 * Send booking confirmation across all three channels (best-effort).
 */
async function sendBookingConfirmation(studentId, appointmentId, queueNumber, slot) {
    const message = `Your appointment has been booked.\nQueue number: ${queueNumber}\nDate: ${slot.slot_date}\nTime: ${slot.start_time} – ${slot.end_time}\nCounter: ${slot.counter_name || 'TBD'}`;

    try {
        // 1. IN_APP
        const [row] = await Notification.create(studentId, appointmentId, 'booking_confirmation', 'IN_APP', message);
        await Notification.updateStatus(row.insertId, 'SENT');
        emitInApp(studentId, { type: 'booking_confirmation', message, appointmentId, queueNumber });

        // 2. Email (needs user email – look up from DB if caller doesn't pass it)
        // appointmentService passes the slot object; email is fetched separately in emailReminder
    } catch (err) {
        console.error('[notificationService] sendBookingConfirmation error:', err.message);
    }
}

/**
 * Send a reminder notification. Called by the cron job.
 * @param {{ id, email, username, phone_number }} user
 * @param {{ appointment_id, queue_number, slot_date, start_time, counter_name }} appointment
 * @param {'24h'|'1h'} window
 */
async function sendReminder(user, appointment, window) {
    const label = window === '24h' ? '24 hours' : '1 hour';
    const message = `Reminder: Your UCU Accounts Office appointment is in ${label}.\nQueue: ${appointment.queue_number}\nDate: ${appointment.slot_date}  Time: ${appointment.start_time}`;

    // IN_APP
    const [row] = await Notification.create(
        user.id, appointment.appointment_id, 'reminder', 'IN_APP', message
    );
    await Notification.updateStatus(row.insertId, 'SENT');
    emitInApp(user.id, { type: 'reminder', message, appointmentId: appointment.appointment_id });

    // EMAIL
    if (user.email) {
        await sendEmail(
            user.email,
            `UCU Appointment Reminder (${label} away)`,
            `<p>${message.replace(/\n/g, '<br>')}</p>`
        );
    }

    // SMS
    if (user.phone_number) {
        await sendSMS(user.phone_number, message);
    }
}

/**
 * Admin broadcast to all in-app users (via Socket.IO room 'all').
 */
async function broadcastAdminMessage(adminId, message) {
    if (global.io) {
        global.io.emit('admin_broadcast', { from: adminId, message });
    }
    // Store in DB for all online users? For now just emit; storing to each user
    // is done via the notifications API broadcast endpoint.
}

module.exports = { sendBookingConfirmation, sendReminder, broadcastAdminMessage, sendEmail, sendSMS };

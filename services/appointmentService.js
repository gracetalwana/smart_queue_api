/**
 * services/appointmentService.js
 *
 * Transactional booking, cancellation, and rescheduling.
 * Each public function acquires its own DB connection and runs
 * BEGIN / COMMIT / ROLLBACK so that slot capacity updates and
 * appointment inserts are atomic.
 */
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const { generateQueueNumber, emitQueueUpdate } = require('./queueService');
const Notification = require('../models/notificationModel');
const notificationService = require('./notificationService');

// Re-use connection settings from env (pool cannot be used inside transactions easily)
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT || 3306,
};

/**
 * Book an appointment for a student.
 *
 * Steps (inside one transaction):
 *  1. Lock the slot row for update.
 *  2. Check capacity (booked_count < max_capacity).
 *  3. Generate queue number.
 *  4. Insert appointment row.
 *  5. Increment booked_count.
 *  6. Commit.
 *  7. Send booking confirmation notification.
 *  8. Emit Socket.IO queue_updated event.
 *
 * @param {number} studentId
 * @param {number} slotId
 * @param {string} reason
 * @returns {Promise<{appointment_id, queue_number}>}
 */
async function bookAppointment(studentId, slotId, reason = 'general') {
    const conn = await mysql.createConnection(dbConfig);
    try {
        await conn.beginTransaction();

        // 1. Lock slot row
        const [[slot]] = await conn.execute(
            'SELECT * FROM time_slots WHERE slot_id = ? AND is_active = 1 FOR UPDATE',
            [slotId]
        );
        if (!slot) {
            await conn.rollback();
            throw Object.assign(new Error('Slot not found or inactive.'), { status: 404 });
        }

        // 2. Capacity check
        if (slot.booked_count >= slot.max_capacity) {
            await conn.rollback();
            throw Object.assign(new Error('Slot is fully booked.'), { status: 409 });
        }

        // 3. Prevent duplicate booking for same student + slot
        const [[dup]] = await conn.execute(
            `SELECT appointment_id FROM appointments
       WHERE student_id = ? AND slot_id = ? AND status NOT IN ('CANCELLED','NO_SHOW') AND is_deleted = 0`,
            [studentId, slotId]
        );
        if (dup) {
            await conn.rollback();
            throw Object.assign(new Error('You already have a booking for this slot.'), { status: 409 });
        }

        // 4. Queue number
        const today = slot.slot_date instanceof Date
            ? slot.slot_date.toISOString().split('T')[0]
            : slot.slot_date;
        const queueNumber = await generateQueueNumber(conn, slotId, today);

        // 5. Insert appointment
        const [result] = await conn.execute(
            `INSERT INTO appointments (student_id, slot_id, counter_id, queue_number, reason)
       VALUES (?, ?, ?, ?, ?)`,
            [studentId, slotId, slot.counter_id, queueNumber, reason]
        );
        const appointmentId = result.insertId;

        // 6. Increment booked_count
        await conn.execute(
            'UPDATE time_slots SET booked_count = booked_count + 1 WHERE slot_id = ?',
            [slotId]
        );

        await conn.commit();

        // 7. Notification (fire-and-forget – don't fail booking on email error)
        notificationService.sendBookingConfirmation(studentId, appointmentId, queueNumber, slot)
            .catch(console.error);

        // 8. Socket.IO
        emitQueueUpdate(slotId, { event: 'booked', slotId, queueNumber, appointmentId });

        return { appointment_id: appointmentId, queue_number: queueNumber };
    } catch (err) {
        await conn.rollback().catch(() => { });
        throw err;
    } finally {
        await conn.end();
    }
}

/**
 * Cancel an appointment.
 * Decrements slot booked_count and emits a queue update.
 */
async function cancelAppointment(appointmentId, requesterId, requesterRole) {
    const conn = await mysql.createConnection(dbConfig);
    try {
        await conn.beginTransaction();

        const [[appt]] = await conn.execute(
            'SELECT * FROM appointments WHERE appointment_id = ? AND is_deleted = 0 FOR UPDATE',
            [appointmentId]
        );
        if (!appt) throw Object.assign(new Error('Appointment not found.'), { status: 404 });

        // Students can only cancel their own
        if (requesterRole === 'STUDENT' && appt.student_id !== requesterId) {
            throw Object.assign(new Error('Forbidden.'), { status: 403 });
        }
        if (['SERVED', 'SERVING'].includes(appt.status)) {
            throw Object.assign(new Error('Cannot cancel an appointment that is already being served.'), { status: 409 });
        }

        await conn.execute(
            `UPDATE appointments SET status = 'CANCELLED', cancelled_at = NOW() WHERE appointment_id = ?`,
            [appointmentId]
        );
        await conn.execute(
            'UPDATE time_slots SET booked_count = GREATEST(booked_count - 1, 0) WHERE slot_id = ?',
            [appt.slot_id]
        );

        await conn.commit();

        emitQueueUpdate(appt.slot_id, { event: 'cancelled', slotId: appt.slot_id, appointmentId });
        return { message: 'Appointment cancelled.' };
    } catch (err) {
        await conn.rollback().catch(() => { });
        throw err;
    } finally {
        await conn.end();
    }
}

/**
 * Mark an appointment as SERVED or NO_SHOW (admin action).
 */
async function updateAppointmentStatus(appointmentId, status) {
    const conn = await mysql.createConnection(dbConfig);
    try {
        await conn.beginTransaction();

        const [[appt]] = await conn.execute(
            'SELECT * FROM appointments WHERE appointment_id = ? AND is_deleted = 0 FOR UPDATE',
            [appointmentId]
        );
        if (!appt) throw Object.assign(new Error('Appointment not found.'), { status: 404 });

        let sql;
        if (status === 'SERVED') {
            sql = `UPDATE appointments SET status = 'SERVED', served_at = NOW() WHERE appointment_id = ?`;
        } else if (status === 'NO_SHOW') {
            sql = `UPDATE appointments SET status = 'NO_SHOW' WHERE appointment_id = ?`;
            // Decrement count so another student could potentially book
            await conn.execute(
                'UPDATE time_slots SET booked_count = GREATEST(booked_count - 1, 0) WHERE slot_id = ?',
                [appt.slot_id]
            );
        } else {
            sql = `UPDATE appointments SET status = ? WHERE appointment_id = ?`;
            await conn.execute(sql, [status, appointmentId]);
            await conn.commit();
            emitQueueUpdate(appt.slot_id, { event: 'status_change', status, appointmentId, slotId: appt.slot_id });
            return { message: `Appointment status updated to ${status}.` };
        }

        await conn.execute(sql, [appointmentId]);
        await conn.commit();

        emitQueueUpdate(appt.slot_id, { event: 'status_change', status, appointmentId, slotId: appt.slot_id });
        return { message: `Appointment marked as ${status}.` };
    } catch (err) {
        await conn.rollback().catch(() => { });
        throw err;
    } finally {
        await conn.end();
    }
}

module.exports = { bookAppointment, cancelAppointment, updateAppointmentStatus };

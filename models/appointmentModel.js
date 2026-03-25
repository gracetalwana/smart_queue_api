/**
 * models/appointmentModel.js – Data Access Layer for Appointments
 */
const db = require('../config/db');

const Appointment = {
    /** Insert a new appointment row. */
    create: (studentId, slotId, counterId, queueNumber, reason = 'general') => {
        const sql = `
      INSERT INTO appointments (student_id, slot_id, counter_id, queue_number, reason)
      VALUES (?, ?, ?, ?, ?)
    `;
        return db.query(sql, [studentId, slotId, counterId, queueNumber, reason]);
    },

    /** Return a single appointment by primary key (exclude soft-deleted). */
    findById: (id) => {
        const sql = `
      SELECT a.*, ts.slot_date, ts.start_time, ts.end_time, c.counter_name,
             u.username, u.full_name, u.email, u.phone_number
      FROM   appointments a
      JOIN   time_slots ts ON ts.slot_id    = a.slot_id
      JOIN   users      u  ON u.id          = a.student_id
      LEFT JOIN counters c ON c.counter_id  = a.counter_id
      WHERE  a.appointment_id = ? AND a.is_deleted = 0
    `;
        return db.query(sql, [id]);
    },

    /** All active appointments for a slot, ordered by queue number. */
    getBySlot: (slotId) => {
        const sql = `
      SELECT a.*, u.username, u.full_name, u.phone_number
      FROM   appointments a
      JOIN   users u ON u.id = a.student_id
      WHERE  a.slot_id = ? AND a.is_deleted = 0
      ORDER BY CAST(SUBSTRING_INDEX(a.queue_number, '-', -1) AS UNSIGNED) ASC
    `;
        return db.query(sql, [slotId]);
    },

    /** A student's own appointment history. */
    getByStudent: (studentId) => {
        const sql = `
      SELECT a.*, ts.slot_date, ts.start_time, ts.end_time, c.counter_name
      FROM   appointments a
      JOIN   time_slots ts ON ts.slot_id = a.slot_id
      LEFT JOIN counters c ON c.counter_id = a.counter_id
      WHERE  a.student_id = ? AND a.is_deleted = 0
      ORDER BY a.booked_at DESC
    `;
        return db.query(sql, [studentId]);
    },

    /** Update appointment status; sets served_at / cancelled_at automatically. */
    updateStatus: (id, status) => {
        let sql;
        if (status === 'SERVED') {
            sql = `UPDATE appointments SET status = 'SERVED', served_at = NOW() WHERE appointment_id = ?`;
        } else if (status === 'CANCELLED') {
            sql = `UPDATE appointments SET status = 'CANCELLED', cancelled_at = NOW() WHERE appointment_id = ?`;
        } else {
            sql = `UPDATE appointments SET status = ? WHERE appointment_id = ?`;
            return db.query(sql, [status, id]);
        }
        return db.query(sql, [id]);
    },

    /** Soft delete – keeps the row for audit. */
    softDelete: (id) => {
        return db.query(
            `UPDATE appointments SET is_deleted = 1, status = 'CANCELLED', cancelled_at = NOW()
       WHERE appointment_id = ?`,
            [id]
        );
    },

    /**
     * Returns the max numeric part of queue_number for a given slot on a given date.
     * Used to generate the next Q-XXX number.
     */
    getMaxQueueIndex: (slotId, dateStr) => {
        const sql = `
      SELECT MAX(CAST(SUBSTRING_INDEX(queue_number, '-', -1) AS UNSIGNED)) AS maxIdx
      FROM   appointments
      WHERE  slot_id = ? AND DATE(booked_at) = ?
    `;
        return db.query(sql, [slotId, dateStr]);
    },

    /** Count how many BOOKED or SERVING appointments are ahead in the queue. */
    getQueuePosition: (slotId, queueNumber) => {
        const idx = parseInt(queueNumber.split('-')[1], 10);
        const sql = `
      SELECT COUNT(*) AS position
      FROM   appointments
      WHERE  slot_id = ?
        AND  CAST(SUBSTRING_INDEX(queue_number, '-', -1) AS UNSIGNED) < ?
        AND  status IN ('PENDING','SERVING')
        AND  is_deleted = 0
    `;
        return db.query(sql, [slotId, idx]);
    },

    /** Mark all PENDING appointments past slot end time as NO_SHOW. */
    markNoShows: (slotId) => {
        return db.query(
            `UPDATE appointments SET status = 'NO_SHOW'
       WHERE slot_id = ? AND status = 'PENDING' AND is_deleted = 0`,
            [slotId]
        );
    },
};

module.exports = Appointment;

/**
 * services/queueService.js
 *
 * Pure queue-domain logic:
 *  - generateQueueNumber   → format Q-001 scoped per slot per day
 *  - estimateWaitTime      → average_service_time × queue_position (minutes)
 *  - advanceQueue          → called after SERVED or NO_SHOW to emit real-time event
 */
const Appointment = require('../models/appointmentModel');

// Average minutes to serve one student (configurable via env)
const AVG_SERVICE_MINUTES = Number(process.env.AVG_SERVICE_MINUTES) || 5;

/**
 * Generate next queue number for a slot on a given date.
 * Format: Q-001, Q-002 …
 * Uses the appointments table MAX so it is safe under concurrent inserts
 * when called inside a DB transaction.
 *
 * @param {object} conn  – mysql2 connection (from within a transaction)
 * @param {number} slotId
 * @param {string} dateStr – 'YYYY-MM-DD'
 * @returns {Promise<string>}
 */
async function generateQueueNumber(conn, slotId, dateStr) {
    // Uses the same conn that holds the FOR UPDATE lock on time_slots,
    // so concurrent bookings cannot both read the same maxIdx.
    const [[{ maxIdx }]] = await conn.execute(
        `SELECT MAX(CAST(SUBSTRING_INDEX(queue_number, '-', -1) AS UNSIGNED)) AS maxIdx
         FROM   appointments
         WHERE  slot_id    = ?
           AND  DATE(booked_at) = ?
           AND  is_deleted = 0
           AND  status NOT IN ('CANCELLED', 'NO_SHOW')`,
        [slotId, dateStr]
    );

    const next = (maxIdx === null ? 0 : maxIdx) + 1;
    return `Q-${String(next).padStart(3, '0')}`;
}

/**
 * Estimate wait time in minutes for a student at queueNumber in a slot.
 * @param {number} slotId
 * @param {string} queueNumber – e.g. 'Q-007'
 * @returns {Promise<number>} minutes
 */
async function estimateWaitTime(slotId, queueNumber) {
    const [rows] = await Appointment.getQueuePosition(slotId, queueNumber);
    const position = rows[0]?.position ?? 0;
    return position * AVG_SERVICE_MINUTES;
}

/**
 * Emit a Socket.IO event to all clients watching a slot.
 * The `io` instance is attached to global at server startup.
 *
 * @param {number} slotId
 * @param {object} payload
 */
function emitQueueUpdate(slotId, payload) {
    if (global.io) {
        global.io.to(`slot_${slotId}`).emit('queue_updated', payload);
    }
}

module.exports = { generateQueueNumber, estimateWaitTime, emitQueueUpdate };

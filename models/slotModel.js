/**
 * models/slotModel.js – Data Access Layer for Time Slots
 */
const db = require('../config/db');

const Slot = {

    /** Admin creates a time slot. */
    create: (adminId, counterId, slotDate, startTime, endTime, maxCapacity = 10) => {
        const sql = `
            INSERT INTO time_slots 
            (admin_id, counter_id, slot_date, start_time, end_time, max_capacity)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        return db.query(sql, [
            adminId,
            counterId,
            slotDate,
            startTime,
            endTime,
            maxCapacity
        ]);
    },

    /** Get slot by ID */
    getById: (id) => {
        const sql = `
            SELECT ts.*, c.counter_name, c.service_type
            FROM time_slots ts
            LEFT JOIN counters c ON c.counter_id = ts.counter_id
            WHERE ts.slot_id = ?
        `;
        return db.query(sql, [id]);
    },

    /** Slots by date (student view) */
    getByDate: (date) => {
        const sql = `
            SELECT 
                ts.*,
                c.counter_name,
                COALESCE(ts.max_capacity - ts.booked_count, ts.max_capacity) AS remaining_capacity
            FROM time_slots ts
            LEFT JOIN counters c ON c.counter_id = ts.counter_id
            WHERE ts.slot_date = ? AND ts.is_active = 1
            ORDER BY ts.start_time
        `;
        return db.query(sql, [date]);
    },

    /** Active future slots */
    getAllActive: () => {
        const sql = `
            SELECT 
                ts.*,
                c.counter_name,
                COALESCE(ts.max_capacity - ts.booked_count, ts.max_capacity) AS remaining_capacity
            FROM time_slots ts
            LEFT JOIN counters c ON c.counter_id = ts.counter_id
            WHERE ts.is_active = 1 AND ts.slot_date >= CURDATE()
            ORDER BY ts.slot_date, ts.start_time
        `;
        return db.query(sql);
    },

    /** All slots (admin) */
    getAll: () => {
        const sql = `
            SELECT 
                ts.*,
                c.counter_name,
                COALESCE(ts.max_capacity - ts.booked_count, ts.max_capacity) AS remaining_capacity
            FROM time_slots ts
            LEFT JOIN counters c ON c.counter_id = ts.counter_id
            ORDER BY ts.slot_date DESC, ts.start_time
        `;
        return db.query(sql);
    },

    /** Update slot safely */
    update: (id, fields) => {
        const sql = `
            UPDATE time_slots
            SET 
                counter_id = COALESCE(?, counter_id),
                slot_date = COALESCE(?, slot_date),
                start_time = COALESCE(?, start_time),
                end_time = COALESCE(?, end_time),
                max_capacity = COALESCE(?, max_capacity),
                is_active = COALESCE(?, is_active)
            WHERE slot_id = ?
        `;

        return db.query(sql, [
            fields.counterId ?? null,
            fields.slotDate ?? null,
            fields.startTime ?? null,
            fields.endTime ?? null,
            fields.maxCapacity ?? null,
            fields.isActive ?? null,
            id
        ]);
    },

    /** Increment booked count */
    incrementBookedCount: (slotId) => {
        return db.query(`
            UPDATE time_slots 
            SET booked_count = booked_count + 1 
            WHERE slot_id = ?
        `, [slotId]);
    },

    /** Decrement booked count safely */
    decrementBookedCount: (slotId) => {
        return db.query(`
            UPDATE time_slots 
            SET booked_count = GREATEST(booked_count - 1, 0)
            WHERE slot_id = ?
        `, [slotId]);
    },

    /** Deactivate slot */
    deactivate: (id) => {
        return db.query(
            'UPDATE time_slots SET is_active = 0 WHERE slot_id = ?',
            [id]
        );
    }
};

module.exports = Slot;
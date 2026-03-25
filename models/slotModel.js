/**
 * models/slotModel.js – Data Access Layer for Time Slots
 */
const db = require('../config/db');

const Slot = {
    /** Admin creates a time slot. */
    create: (adminId, counterId, slotDate, startTime, endTime, maxCapacity = 10) => {
        const sql = `
      INSERT INTO time_slots (admin_id, counter_id, slot_date, start_time, end_time, max_capacity)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
        return db.query(sql, [adminId, counterId, slotDate, startTime, endTime, maxCapacity]);
    },

    /** Return single slot by id. */
    getById: (id) => {
        const sql = `
      SELECT ts.*, c.counter_name, c.service_type
      FROM time_slots ts
      LEFT JOIN counters c ON c.counter_id = ts.counter_id
      WHERE ts.slot_id = ?
    `;
        return db.query(sql, [id]);
    },

    /** All active slots for a given date (students browse). */
    getByDate: (date) => {
        const sql = `
      SELECT ts.*, c.counter_name,
             (ts.max_capacity - ts.booked_count) AS remaining_capacity
      FROM time_slots ts
      LEFT JOIN counters c ON c.counter_id = ts.counter_id
      WHERE ts.slot_date = ? AND ts.is_active = 1
      ORDER BY ts.start_time
    `;
        return db.query(sql, [date]);
    },

    /** All active future slots (default student view). */
    getAllActive: () => {
        const sql = `
      SELECT ts.*, c.counter_name,
             (ts.max_capacity - ts.booked_count) AS remaining_capacity
      FROM time_slots ts
      LEFT JOIN counters c ON c.counter_id = ts.counter_id
      WHERE ts.is_active = 1 AND ts.slot_date >= CURDATE()
      ORDER BY ts.slot_date, ts.start_time
    `;
        return db.query(sql);
    },

    /** Admin – list all slots (including past). */
    getAll: () => {
        const sql = `
      SELECT ts.*, c.counter_name,
             (ts.max_capacity - ts.booked_count) AS remaining_capacity
      FROM time_slots ts
      LEFT JOIN counters c ON c.counter_id = ts.counter_id
      ORDER BY ts.slot_date DESC, ts.start_time
    `;
        return db.query(sql);
    },

    /** Update slot details. */
    update: (id, fields) => {
        const { counterId, slotDate, startTime, endTime, maxCapacity, isActive } = fields;
        const sql = `
      UPDATE time_slots
      SET counter_id = ?, slot_date = ?, start_time = ?, end_time = ?, max_capacity = ?, is_active = ?
      WHERE slot_id = ?
    `;
        return db.query(sql, [counterId, slotDate, startTime, endTime, maxCapacity, isActive, id]);
    },

    /** Increment booked_count when an appointment is created. */
    incrementBookedCount: (slotId) => {
        return db.query(
            'UPDATE time_slots SET booked_count = booked_count + 1 WHERE slot_id = ?',
            [slotId]
        );
    },

    /** Decrement booked_count when an appointment is cancelled. */
    decrementBookedCount: (slotId) => {
        return db.query(
            'UPDATE time_slots SET booked_count = GREATEST(booked_count - 1, 0) WHERE slot_id = ?',
            [slotId]
        );
    },

    /** Deactivate a slot. */
    deactivate: (id) => {
        return db.query('UPDATE time_slots SET is_active = 0 WHERE slot_id = ?', [id]);
    },
};

module.exports = Slot;

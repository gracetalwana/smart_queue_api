/**
 * models/counterModel.js – Data Access Layer for Service Counters
 */
const db = require('../config/db');

const Counter = {
    /** Create a new counter. */
    create: (name, serviceType = 'accounts', isActive = 1) => {
        return db.query(
            'INSERT INTO counters (counter_name, service_type, is_active) VALUES (?, ?, ?)',
            [name, serviceType, isActive]
        );
    },

    /** List all counters. */
    getAll: () => {
        return db.query('SELECT * FROM counters ORDER BY counter_name');
    },

    /** Get all active counters. */
    getActive: () => {
        return db.query('SELECT * FROM counters WHERE is_active = 1 ORDER BY counter_name');
    },

    /** Find counter by id. */
    findById: (id) => {
        return db.query('SELECT * FROM counters WHERE counter_id = ?', [id]);
    },

    /** Toggle active status. */
    setActive: (id, isActive) => {
        return db.query('UPDATE counters SET is_active = ? WHERE counter_id = ?', [isActive, id]);
    },
};

module.exports = Counter;

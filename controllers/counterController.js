/**
 * controllers/counterController.js
 */
const Counter = require('../models/counterModel');

/** GET /api/counters */
const getCounters = async (_req, res) => {
    try {
        const [rows] = await Counter.getAll();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/** POST /api/counters – admin creates a new counter. */
const createCounter = async (req, res) => {
    const { name, description } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required.' });
    try {
        const [result] = await Counter.create(name.trim(), description || null);
        const [rows] = await Counter.findById(result.insertId);
        res.status(201).json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/** PATCH /api/counters/:id/toggle – admin toggles active status. */
const toggleCounter = async (req, res) => {
    try {
        const [rows] = await Counter.findById(req.params.id);
        if (!rows.length) return res.status(404).json({ error: 'Counter not found.' });

        const current = rows[0];
        await Counter.setActive(req.params.id, !current.is_active);
        const [updated] = await Counter.findById(req.params.id);
        res.json(updated[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getCounters, createCounter, toggleCounter };

/**
 * controllers/slotController.js – Time Slot management
 */
const Joi = require('joi');
const Slot = require('../models/slotModel');

const createSchema = Joi.object({
    counter_id: Joi.number().integer().allow(null).default(null),
    slot_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    start_time: Joi.string().required(),
    end_time: Joi.string().required(),
    max_capacity: Joi.number().integer().min(1).max(500).default(10),
    description: Joi.string().allow('', null).optional(),
});

/** POST /api/slots – admin creates a slot. */
const createSlot = async (req, res) => {
    const { error, value } = createSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const [result] = await Slot.create(
            req.user.id, value.counter_id, value.slot_date,
            value.start_time, value.end_time, value.max_capacity
        );
        res.status(201).json({ message: 'Slot created.', slot_id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/** GET /api/slots – students view available slots. */
const getSlots = async (req, res) => {
    try {
        const { date } = req.query;
        const [slots] = date ? await Slot.getByDate(date) : await Slot.getAllActive();
        res.json(slots);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/** GET /api/slots/all – admin: all slots incl. past. */
const getAllSlots = async (req, res) => {
    try {
        const [slots] = await Slot.getAll();
        res.json(slots);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/** GET /api/slots/:id */
const getSlotById = async (req, res) => {
    try {
        const [rows] = await Slot.getById(req.params.id);
        if (!rows.length) return res.status(404).json({ error: 'Slot not found.' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/** PUT /api/slots/:id – admin updates a slot. */
const updateSlot = async (req, res) => {
    const { counter_id, slot_date, start_time, end_time, max_capacity, is_active } = req.body;
    try {
        await Slot.update(req.params.id, {
            counterId: counter_id, slotDate: slot_date,
            startTime: start_time, endTime: end_time,
            maxCapacity: max_capacity, isActive: is_active,
        });
        res.json({ message: 'Slot updated.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { createSlot, getSlots, getAllSlots, getSlotById, updateSlot };

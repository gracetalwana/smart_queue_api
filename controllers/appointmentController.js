/**
 * controllers/appointmentController.js – Appointment booking + queue management
 */
const Joi = require('joi');
const Appointment = require('../models/appointmentModel');
const appointmentService = require('../services/appointmentService');
const { estimateWaitTime } = require('../services/queueService');

const bookSchema = Joi.object({
    slot_id: Joi.number().integer().required(),
    reason: Joi.string().valid('general', 'billing', 'transcript', 'other').default('general'),
});

/** POST /api/appointments – student books a slot. */
const bookAppointment = async (req, res) => {
    const { error, value } = bookSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const result = await appointmentService.bookAppointment(req.user.id, value.slot_id, value.reason);
        res.status(201).json({ message: 'Appointment booked.', ...result });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
};

/** GET /api/appointments/:id */
const getAppointment = async (req, res) => {
    try {
        const [rows] = await Appointment.findById(req.params.id);
        if (!rows.length) return res.status(404).json({ error: 'Appointment not found.' });

        const appt = rows[0];
        // Non-admin students can only see their own
        if (req.user.role === 'STUDENT' && appt.student_id !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden.' });
        }

        const waitMinutes = await estimateWaitTime(appt.slot_id, appt.queue_number);
        res.json({ ...appt, estimated_wait_minutes: waitMinutes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/** GET /api/appointments/my – student's own bookings. */
const getMyAppointments = async (req, res) => {
    try {
        const [rows] = await Appointment.getByStudent(req.user.id);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/** GET /api/appointments?slot_id=X – admin: all appointments for a slot. */
const getAppointmentsBySlot = async (req, res) => {
    const { slot_id } = req.query;
    if (!slot_id) return res.status(400).json({ error: 'slot_id query param is required.' });
    try {
        const [rows] = await Appointment.getBySlot(slot_id);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/** PATCH /api/appointments/:id/cancel */
const cancelAppointment = async (req, res) => {
    try {
        const result = await appointmentService.cancelAppointment(
            Number(req.params.id), req.user.id, req.user.role
        );
        res.json(result);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
};

/** PATCH /api/appointments/:id/served – admin marks as SERVED. */
const markServed = async (req, res) => {
    try {
        const result = await appointmentService.updateAppointmentStatus(Number(req.params.id), 'SERVED');
        res.json(result);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
};

/** PATCH /api/appointments/:id/no-show – admin marks as NO_SHOW. */
const markNoShow = async (req, res) => {
    try {
        const result = await appointmentService.updateAppointmentStatus(Number(req.params.id), 'NO_SHOW');
        res.json(result);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
};

/** PATCH /api/appointments/:id/serving – admin marks as SERVING. */
const markServing = async (req, res) => {
    try {
        const result = await appointmentService.updateAppointmentStatus(Number(req.params.id), 'SERVING');
        res.json(result);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
};

module.exports = {
    bookAppointment, getAppointment, getMyAppointments,
    getAppointmentsBySlot, cancelAppointment, markServed, markNoShow, markServing,
};

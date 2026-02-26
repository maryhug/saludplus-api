const router = require('express').Router();
const { createAppointment } = require('../services/appointmentService');

// CREATE appointment
router.post('/', async (req, res) => {
    try {
        const {
            appointment_id,
            appointment_date,
            patient_id,
            doctor_id,
            treatment_id,
            insurance_id,
            amount_paid,
        } = req.body;

        const result = await createAppointment({
            appointment_id,
            appointment_date,
            patient_id,
            doctor_id,
            treatment_id,
            insurance_id,
            amount_paid,
        });

        res.status(201).json({
            ok: true,
            message: 'Appointment created successfully',
            appointment: result.appointment,
        });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ ok: false, error: err.message });
    }
});

module.exports = router;

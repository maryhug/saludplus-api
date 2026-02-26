// src/routes/appoiments.js

// Crea un router de Express para manejar las rutas relacionadas con citas (appointments).
const router = require('express').Router();
// Importa el servicio que encapsula la lógica de creación de una cita en la base de datos.
const { createAppointment } = require('../services/appointmentService');

// Ruta HTTP POST para crear una nueva cita.
// Endpoint: POST /api/appointments (según cómo se monte este router en index.js).
router.post('/', async (req, res) => {
    try {
        // Extrae del cuerpo de la petición los campos necesarios para crear la cita.
        const {
            appointment_id,
            appointment_date,
            patient_id,
            doctor_id,
            treatment_id,
            insurance_id,
            amount_paid,
        } = req.body;

        // Llama al servicio de dominio, que se encarga de validar e insertar en PostgreSQL.
        const result = await createAppointment({
            appointment_id,
            appointment_date,
            patient_id,
            doctor_id,
            treatment_id,
            insurance_id,
            amount_paid,
        });

        // Responde al cliente con código 201 (creado) y los datos de la cita creada.
        res.status(201).json({
            ok: true,
            message: 'Appointment created successfully',
            appointment: result.appointment,
        });
    } catch (err) {
        // Manejo de errores: si el servicio lanza un error con status, lo respetamos;
        // si no, devolvemos 500 (error interno del servidor).
        const status = err.status || 500;
        res.status(status).json({ ok: false, error: err.message });
    }
});

// Exporta el router para ser usado en el archivo principal de rutas.
module.exports = router;

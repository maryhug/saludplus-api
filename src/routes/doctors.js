// src/routes/doctors.js

// Crea un router de Express para manejar todas las rutas relacionadas con doctores.
const router = require('express').Router();
// Importa las funciones del servicio de doctores, donde está la lógica de negocio
// y el acceso a la base de datos PostgreSQL.
const {
    getDoctors,
    getDoctorById,
    updateDoctor,
    createDoctor,
    deleteDoctor,
} = require('../services/doctorService');


// CREATE doctor
// Endpoint: POST /api/doctors
// Crea un nuevo doctor a partir de los datos enviados en el body.
router.post('/', async (req, res) => {
    try {
        const { name, email, specialty } = req.body;
        // Llama al servicio para insertar el nuevo doctor en la base de datos.
        const doctor = await createDoctor({ name, email, specialty });
        res.status(201).json({
            ok: true,
            message: 'Doctor created successfully',
            doctor,
        });
    } catch (err) {
        // Si el servicio adjunta un status, lo usamos. Si no, respondemos 500.
        const status = err.status || 500;
        res.status(status).json({ ok: false, error: err.message });
    }
});

// READ all doctors
// Endpoint: GET /api/doctors
// Permite listar todos los doctores. Opcionalmente filtra por especialidad (?specialty=...).
router.get('/', async (req, res) => {
    try {
        // Pasa la especialidad como filtro al servicio, usando los query params.
        const doctors = await getDoctors(req.query.specialty);
        res.json({ ok: true, doctors });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// READ doctor by id
// Endpoint: GET /api/doctors/:id
// Obtiene un doctor específico por su id.
router.get('/:id', async (req, res) => {
    try {
        const doctor = await getDoctorById(req.params.id);
        if (!doctor) return res.status(404).json({ ok: false, error: 'Doctor not found' });
        res.json({ ok: true, doctor });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// UPDATE doctor
// Endpoint: PUT /api/doctors/:id
// Actualiza los datos de un doctor existente.
router.put('/:id', async (req, res) => {
    try {
        const { name, email, specialty } = req.body;
        // Envía el id y los nuevos datos al servicio de actualización.
        const doctor = await updateDoctor(req.params.id, { name, email, specialty });
        if (!doctor) return res.status(404).json({ ok: false, error: 'Doctor not found' });
        res.json({ ok: true, message: 'Doctor updated successfully', doctor });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ ok: false, error: err.message });
    }
});

// DELETE doctor
// Endpoint: DELETE /api/doctors/:id
// Elimina un doctor por su id, siempre que no viole restricciones (por ejemplo citas asociadas).
router.delete('/:id', async (req, res) => {
    try {
        const doctor = await deleteDoctor(req.params.id);
        if (!doctor) {
            return res.status(404).json({ ok: false, error: 'Doctor not found' });
        }
        res.json({
            ok: true,
            message: 'Doctor deleted successfully',
            doctor,
        });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ ok: false, error: err.message });
    }
});

// Exporta el router para montarlo en el archivo principal (por ejemplo, en /api/doctors).
module.exports = router;

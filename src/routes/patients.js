// src/routes/patients.js

// Crea un router de Express para todas las operaciones relacionadas con pacientes.
const router = require('express').Router();
// Importa las funciones del servicio de pacientes (capa de negocio y acceso a datos).
const {
    listPatients,
    getPatientById,
    createPatient,
    updatePatient,
    getPatientHistory,
} = require('../services/patientService.js');

// LIST all patients
// Endpoint: GET /api/patients
// Devuelve el listado de todos los pacientes registrados en PostgreSQL.
router.get('/', async (req, res) => {
    try {
        const patients = await listPatients();
        res.json({ ok: true, patients });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET patient by ID
// Endpoint: GET /api/patients/:id
// Obtiene un paciente por su id numérico en la base de datos relacional.
router.get('/:id', async (req, res) => {
    // Validación rápida: si el parámetro parece un email, se indica la ruta correcta para historial.
    if (req.params.id.includes('@')) return res.status(400).json({
        ok: false,
        error: 'Use /api/patients/:email/history for history queries',
    });

    try {
        const patient = await getPatientById(req.params.id);
        if (!patient) {
            return res.status(404).json({ ok: false, error: 'Patient not found' });
        }
        res.json({ ok: true, patient });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// CREATE patient
// Endpoint: POST /api/patients
// Crea un nuevo paciente con sus datos básicos.
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;
        // Llama al servicio para insertar el paciente en la tabla patients.
        const patient = await createPatient({ name, email, phone, address });
        res.status(201).json({
            ok: true,
            message: 'Patient created successfully',
            patient,
        });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ ok: false, error: err.message });
    }
});

// UPDATE patient
// Endpoint: PUT /api/patients/:id
// Actualiza los datos de un paciente ya existente.
router.put('/:id', async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;
        // Envía el id del paciente y los nuevos datos al servicio.
        const patient = await updatePatient(req.params.id, {
            name,
            email,
            phone,
            address,
        });
        if (!patient) {
            return res.status(404).json({ ok: false, error: 'Patient not found' });
        }
        res.json({
            ok: true,
            message: 'Patient updated successfully',
            patient,
        });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ ok: false, error: err.message });
    }
});

// HISTORY (MongoDB)
// Endpoint: GET /api/patients/:email/history
// Devuelve el historial clínico completo de un paciente, almacenado en MongoDB,
// usando el email como clave para buscar su documento en la colección PatientHistory.
router.get('/:email/history', async (req, res) => {
    try {
        const result = await getPatientHistory(req.params.email);
        if (!result) return res.status(404).json({ ok: false, error: 'Patient not found' });
        // result probablemente contiene datos del paciente y el arreglo de citas.
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// Exporta el router para ser montado en el archivo principal (ej. /api/patients).
module.exports = router;

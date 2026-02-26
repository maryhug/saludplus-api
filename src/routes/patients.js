const router = require('express').Router();
const {
    listPatients,
    getPatientById,
    createPatient,
    updatePatient,
    getPatientHistory,
} = require('../services/patientService.js');

// LIST all patients
router.get('/', async (req, res) => {
    try {
        const patients = await listPatients();
        res.json({ ok: true, patients });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET patient by ID
router.get('/:id', async (req, res) => {
    // si la ruta es /:email/history, se maneja abajo
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
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;
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
router.put('/:id', async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;
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
router.get('/:email/history', async (req, res) => {
    try {
        const result = await getPatientHistory(req.params.email);
        if (!result) return res.status(404).json({ ok: false, error: 'Patient not found' });
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;

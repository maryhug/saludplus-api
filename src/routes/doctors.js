const router = require('express').Router();
const {
    getDoctors,
    getDoctorById,
    updateDoctor,
    createDoctor,
    deleteDoctor,
} = require('../services/doctorService');


// CREATE doctor
router.post('/', async (req, res) => {
    try {
        const { name, email, specialty } = req.body;
        const doctor = await createDoctor({ name, email, specialty });
        res.status(201).json({
            ok: true,
            message: 'Doctor created successfully',
            doctor,
        });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ ok: false, error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const doctors = await getDoctors(req.query.specialty);
        res.json({ ok: true, doctors });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const doctor = await getDoctorById(req.params.id);
        if (!doctor) return res.status(404).json({ ok: false, error: 'Doctor not found' });
        res.json({ ok: true, doctor });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { name, email, specialty } = req.body;
        const doctor = await updateDoctor(req.params.id, { name, email, specialty });
        if (!doctor) return res.status(404).json({ ok: false, error: 'Doctor not found' });
        res.json({ ok: true, message: 'Doctor updated successfully', doctor });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ ok: false, error: err.message });
    }
});

// DELETE doctor
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


module.exports = router;

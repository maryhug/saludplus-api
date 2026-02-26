const router = require('express').Router();
const {
    listTreatments,
    getTreatmentById,
    createTreatment,
} = require('../services/treatmentService.js');

// LIST all treatments
router.get('/', async (req, res) => {
    try {
        const treatments = await listTreatments();
        res.json({ ok: true, treatments });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET treatment by ID
router.get('/:id', async (req, res) => {
    try {
        const treatment = await getTreatmentById(req.params.id);
        if (!treatment) {
            return res.status(404).json({ ok: false, error: 'Treatment not found' });
        }
        res.json({ ok: true, treatment });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// CREATE treatment
router.post('/', async (req, res) => {
    try {
        const { code, description, cost } = req.body;
        const treatment = await createTreatment({ code, description, cost });
        res.status(201).json({
            ok: true,
            message: 'Treatment created successfully',
            treatment,
        });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ ok: false, error: err.message });
    }
});

module.exports = router;

const router = require('express').Router();
const {
    listInsurances,
    getInsuranceById,
    createInsurance,
} = require('../services/insuranceService');

// LIST all insurances
router.get('/', async (req, res) => {
    try {
        const insurances = await listInsurances();
        res.json({ ok: true, insurances });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET insurance by ID
router.get('/:id', async (req, res) => {
    try {
        const insurance = await getInsuranceById(req.params.id);
        if (!insurance) {
            return res.status(404).json({ ok: false, error: 'Insurance not found' });
        }
        res.json({ ok: true, insurance });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// CREATE insurance
router.post('/', async (req, res) => {
    try {
        const { name, coverage_percentage } = req.body;
        const insurance = await createInsurance({ name, coverage_percentage });
        res.status(201).json({
            ok: true,
            message: 'Insurance created successfully',
            insurance,
        });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ ok: false, error: err.message });
    }
});

module.exports = router;

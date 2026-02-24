const router = require('express').Router();
const { migrate } = require('../services/migrationService');

router.get('/', (req, res) => {
    res.json({
        ok: true,
        info: 'SaludPlus Hybrid Persistence API',
        availableEndpoints: {
            migrate:        'POST /api/simulacro/migrate',
            doctors:        'GET  /api/doctors',
            doctorById:     'GET  /api/doctors/:id',
            updateDoctor:   'PUT  /api/doctors/:id',
            revenue:        'GET  /api/reports/revenue',
            patientHistory: 'GET  /api/patients/:email/history',
        },
    });
});

router.post('/migrate', async (req, res) => {
    try {
        const { clearBefore = false } = req.body || {};
        const result = await migrate({ clearBefore });
        res.json({ ok: true, message: 'Migration completed successfully', result });
    } catch (err) {
        console.error('Migration error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;

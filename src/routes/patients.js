const router = require('express').Router();
const { getPatientHistory } = require('../services/patientService');

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

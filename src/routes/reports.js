const router = require('express').Router();
const { getRevenueReport } = require('../services/reportService');

router.get('/revenue', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const report = await getRevenueReport({ startDate, endDate });
        res.json({ ok: true, report });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;

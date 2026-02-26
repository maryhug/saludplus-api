// src/routes/reports.js

// Crea un router de Express para las rutas de reportes.
const router = require('express').Router();
// Importa el servicio que genera el reporte de ingresos (revenue).
const { getRevenueReport } = require('../services/reportService');

// Endpoint: GET /api/reports/revenue
// Genera un reporte de ingresos filtrado opcionalmente por rango de fechas (startDate, endDate).
router.get('/revenue', async (req, res) => {
    try {
        // Toma las fechas desde los query params, por ejemplo:
        // /api/reports/revenue?startDate=2024-01-01&endDate=2024-12-31
        const { startDate, endDate } = req.query;

        // Llama al servicio de reportes, que hace las consultas a PostgreSQL
        // y devuelve métricas agregadas (total facturado, etc.).
        const report = await getRevenueReport({ startDate, endDate });

        // Devuelve el reporte en formato JSON.
        res.json({ ok: true, report });
    } catch (err) {
        // Manejo genérico de errores.
        res.status(500).json({ ok: false, error: err.message });
    }
});

// Exporta el router para montarlo en el prefijo /api/reports.
module.exports = router;

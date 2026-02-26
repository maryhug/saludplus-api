// src/routes/simulacro.js

// Crea un router de Express para los endpoints específicos del simulacro.
const router = require('express').Router();
// Importa el servicio de migración, que se encarga de leer el CSV y poblar PostgreSQL + MongoDB.
const { migrate } = require('../services/migrationService');

// Endpoint informativo: GET /api/simulacro
// Devuelve una descripción corta de la API y lista de endpoints disponibles para el simulacro.
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

// Endpoint: POST /api/simulacro/migrate
// Dispara la migración de datos desde el CSV hacia PostgreSQL y MongoDB.
// El body puede incluir { clearBefore: true } para limpiar antes de migrar.
router.post('/migrate', async (req, res) => {
    try {
        // Si el cliente no envía clearBefore, por defecto es false.
        const { clearBefore = false } = req.body || {};
        // Ejecuta la migración y recibe un resultado/resumen (por ejemplo conteos).
        const result = await migrate({ clearBefore });
        res.json({ ok: true, message: 'Migration completed successfully', result });
    } catch (err) {
        console.error('Migration error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// Exporta el router para montarlo bajo /api/simulacro en el archivo principal.
module.exports = router;

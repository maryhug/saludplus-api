const router = require('express').Router();
const { query } = require('../config/postgres');
const { PatientHistory } = require('../config/mongodb');

router.get('/', async (req, res) => {
    try {
        // Verificar si las tablas existen en PostgreSQL
        const tablesRes = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('patients','doctors','appointments','treatments','insurances')
    `);

        const existingTables = tablesRes.rows.map(r => r.table_name);
        const schemaReady = existingTables.length === 5; // todas creadas

        // Si no hay esquema, respondemos directo
        if (!schemaReady) {
            return res.json({
                ok: true,
                schemaReady: false,
                message: 'PostgreSQL schema not initialized. Run "npm run dev" or initSchema() first.',
            });
        }

        // Contar registros en tablas principales de PostgreSQL
        const [
            patientsRes,
            doctorsRes,
            appointmentsRes,
            treatmentsRes,
            insurancesRes,
        ] = await Promise.all([
            query('SELECT COUNT(*) AS count FROM patients'),
            query('SELECT COUNT(*) AS count FROM doctors'),
            query('SELECT COUNT(*) AS count FROM appointments'),
            query('SELECT COUNT(*) AS count FROM treatments'),
            query('SELECT COUNT(*) AS count FROM insurances'),
        ]);

        // Contar historiales en MongoDB
        const historiesCount = await PatientHistory.countDocuments();

        const counts = {
            patients:     Number(patientsRes.rows[0].count),
            doctors:      Number(doctorsRes.rows[0].count),
            appointments: Number(appointmentsRes.rows[0].count),
            treatments:   Number(treatmentsRes.rows[0].count),
            insurances:   Number(insurancesRes.rows[0].count),
            histories:    historiesCount,
        };

        const hasData =
            counts.patients > 0 ||
            counts.appointments > 0 ||
            counts.histories > 0;

        // Detectar el caso: esquema creado pero sin datos
        const isEmpty =
            counts.patients === 0 &&
            counts.doctors === 0 &&
            counts.appointments === 0 &&
            counts.treatments === 0 &&
            counts.insurances === 0 &&
            counts.histories === 0;

        res.json({
            ok: true,
            schemaReady: true,
            postgres: {
                patients:     counts.patients,
                doctors:      counts.doctors,
                appointments: counts.appointments,
                treatments:   counts.treatments,
                insurances:   counts.insurances,
            },
            mongodb: {
                histories: counts.histories,
            },
            hasData,
            isEmpty,
            message: isEmpty
                ? 'Schema is created but there is no data yet. You can run "npm run migrate".'
                : 'Schema and data are present.',
        });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;

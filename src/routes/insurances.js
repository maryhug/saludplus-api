// src/routes/insurances.js

// Crea un router de Express para manejar las rutas relacionadas con aseguradoras (insurances).
const router = require('express').Router();
// Importa las funciones del servicio de seguros, donde está la lógica de acceso a PostgreSQL.
const {
    listInsurances,
    getInsuranceById,
    createInsurance,
} = require('../services/insuranceService');

// LIST all insurances
// Endpoint: GET /api/insurances
// Devuelve el listado de todas las aseguradoras registradas.
router.get('/', async (req, res) => {
    try {
        const insurances = await listInsurances();
        res.json({ ok: true, insurances });
    } catch (err) {
        // Error genérico del servidor si algo falla en la capa de servicio o base de datos.
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET insurance by ID
// Endpoint: GET /api/insurances/:id
// Busca una aseguradora específica por su id.
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
// Endpoint: POST /api/insurances
// Crea una nueva aseguradora con su porcentaje de cobertura.
router.post('/', async (req, res) => {
    try {
        const { name, coverage_percentage } = req.body;
        // Llama al servicio para insertar la nueva aseguradora en la tabla insurances.
        const insurance = await createInsurance({ name, coverage_percentage });
        res.status(201).json({
            ok: true,
            message: 'Insurance created successfully',
            insurance,
        });
    } catch (err) {
        // Si el servicio define un status (por ejemplo, conflicto por nombre duplicado), lo usamos.
        const status = err.status || 500;
        res.status(status).json({ ok: false, error: err.message });
    }
});

// Exporta el router para montarlo en el archivo principal de la API (ej. /api/insurances).
module.exports = router;

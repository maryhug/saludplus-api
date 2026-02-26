// src/routes/treatments.js

// Crea un router de Express para manejar las rutas relacionadas con tratamientos médicos.
const router = require('express').Router();

// Importa las funciones del servicio de tratamientos, donde está la lógica
// para consultar e insertar en la tabla treatments de PostgreSQL.
const {
    listTreatments,
    getTreatmentById,
    createTreatment,
} = require('../services/treatmentService.js');

// LIST all treatments
// Endpoint: GET /api/treatments
// Devuelve el listado completo de tratamientos disponibles.
router.get('/', async (req, res) => {
    try {
        const treatments = await listTreatments();
        res.json({ ok: true, treatments });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET treatment by ID
// Endpoint: GET /api/treatments/:id
// Busca un tratamiento específico por su id.
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
// Endpoint: POST /api/treatments
// Crea un nuevo tratamiento a partir de su código, descripción y costo.
router.post('/', async (req, res) => {
    try {
        const { code, description, cost } = req.body;
        // Llama al servicio de dominio para registrar el tratamiento.
        const treatment = await createTreatment({ code, description, cost });
        res.status(201).json({
            ok: true,
            message: 'Treatment created successfully',
            treatment,
        });
    } catch (err) {
        // Si hay errores de negocio (por ejemplo código duplicado) el servicio puede adjuntar un status.
        const status = err.status || 500;
        res.status(status).json({ ok: false, error: err.message });
    }
});

// Exporta el router para montarlo en el archivo principal bajo /api/treatments.
module.exports = router;

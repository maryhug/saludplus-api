// src/services/treatmentService.js

// Importa la función query para interactuar con la tabla treatments en PostgreSQL.
const { query } = require('../config/postgres.js');

// Lista todos los tratamientos ordenados por su código.
const listTreatments = async () => {
    const result = await query(
        `SELECT id, code, description, cost, created_at
     FROM treatments
     ORDER BY code`
    );
    return result.rows;
};

// Obtiene un tratamiento específico por su id.
const getTreatmentById = async (id) => {
    const result = await query(
        `SELECT id, code, description, cost, created_at
     FROM treatments
     WHERE id = $1`,
        [id]
    );
    return result.rows[0] || null;
};

// Crea un tratamiento nuevo con validaciones de código único y costo.
const createTreatment = async ({ code, description, cost }) => {
    // Validación de campos obligatorios.
    if (!code || !description || cost === undefined) {
        const err = new Error('code, description and cost are required');
        err.status = 400;
        throw err;
    }

    // Verifica que el código de tratamiento no exista ya.
    const existing = await query(
        'SELECT id FROM treatments WHERE code = $1',
        [code.trim()]
    );
    if (existing.rows.length > 0) {
        const err = new Error('Treatment code already exists');
        err.status = 400;
        throw err;
    }

    // Valida que el costo sea numérico y mayor que cero.
    const numericCost = Number(cost);
    if (Number.isNaN(numericCost) || numericCost <= 0) {
        const err = new Error('cost must be a positive number');
        err.status = 400;
        throw err;
    }

    // Inserta el tratamiento y devuelve sus datos principales.
    const result = await query(
        `INSERT INTO treatments (code, description, cost)
     VALUES ($1, $2, $3)
     RETURNING id, code, description, cost, created_at`,
        [code.trim(), description.trim(), numericCost]
    );

    return result.rows[0];
};

// Exporta las funciones del servicio para usarlas en las rutas HTTP.
module.exports = {
    listTreatments,
    getTreatmentById,
    createTreatment,
};

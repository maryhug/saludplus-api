// src/services/insuranceService.js

// Importa la función query para interactuar con la tabla insurances en PostgreSQL.
const { query } = require('../config/postgres.js');

// Lista todas las aseguradoras ordenadas por nombre.
const listInsurances = async () => {
    const result = await query(
        `SELECT id, name, coverage_percentage, created_at
     FROM insurances
     ORDER BY name`
    );
    return result.rows;
};

// Obtiene una aseguradora específica por su id.
const getInsuranceById = async (id) => {
    const result = await query(
        `SELECT id, name, coverage_percentage, created_at
     FROM insurances
     WHERE id = $1`,
        [id]
    );
    return result.rows[0] || null;
};

// Crea una nueva aseguradora con validaciones de negocio.
const createInsurance = async ({ name, coverage_percentage }) => {
    // Validación de campos obligatorios.
    if (!name || coverage_percentage === undefined) {
        const err = new Error('name and coverage_percentage are required');
        err.status = 400;
        throw err;
    }

    // Verifica que no exista otra aseguradora con el mismo nombre.
    const existing = await query(
        'SELECT id FROM insurances WHERE name = $1',
        [name.trim()]
    );
    if (existing.rows.length > 0) {
        const err = new Error('Insurance name already exists');
        err.status = 400;
        throw err;
    }

    // Convierte y valida el porcentaje de cobertura (0–100).
    const coverage = Number(coverage_percentage);
    if (Number.isNaN(coverage) || coverage < 0 || coverage > 100) {
        const err = new Error('coverage_percentage must be between 0 and 100');
        err.status = 400;
        throw err;
    }

    // Inserta la nueva aseguradora y devuelve sus datos principales.
    const result = await query(
        `INSERT INTO insurances (name, coverage_percentage)
     VALUES ($1, $2)
     RETURNING id, name, coverage_percentage, created_at`,
        [name.trim(), coverage]
    );

    return result.rows[0];
};

// Exporta las funciones del servicio para que las usen las rutas.
module.exports = {
    listInsurances,
    getInsuranceById,
    createInsurance,
};

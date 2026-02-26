const { query } = require('../config/postgres.js');

const listInsurances = async () => {
    const result = await query(
        `SELECT id, name, coverage_percentage, created_at
     FROM insurances
     ORDER BY name`
    );
    return result.rows;
};

const getInsuranceById = async (id) => {
    const result = await query(
        `SELECT id, name, coverage_percentage, created_at
     FROM insurances
     WHERE id = $1`,
        [id]
    );
    return result.rows[0] || null;
};

const createInsurance = async ({ name, coverage_percentage }) => {
    if (!name || coverage_percentage === undefined) {
        const err = new Error('name and coverage_percentage are required');
        err.status = 400;
        throw err;
    }

    const existing = await query(
        'SELECT id FROM insurances WHERE name = $1',
        [name.trim()]
    );
    if (existing.rows.length > 0) {
        const err = new Error('Insurance name already exists');
        err.status = 400;
        throw err;
    }

    const coverage = Number(coverage_percentage);
    if (Number.isNaN(coverage) || coverage < 0 || coverage > 100) {
        const err = new Error('coverage_percentage must be between 0 and 100');
        err.status = 400;
        throw err;
    }

    const result = await query(
        `INSERT INTO insurances (name, coverage_percentage)
     VALUES ($1, $2)
     RETURNING id, name, coverage_percentage, created_at`,
        [name.trim(), coverage]
    );

    return result.rows[0];
};

module.exports = {
    listInsurances,
    getInsuranceById,
    createInsurance,
};

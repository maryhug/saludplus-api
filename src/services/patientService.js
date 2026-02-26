const { query } = require('../config/postgres.js');
const { PatientHistory } = require('../config/mongodb.js');

// ========== SQL: CRUD patients ==========

const listPatients = async () => {
    const result = await query(
        'SELECT id, name, email, phone, address, created_at FROM patients ORDER BY name'
    );
    return result.rows;
};

const getPatientById = async (id) => {
    const result = await query(
        'SELECT id, name, email, phone, address, created_at FROM patients WHERE id = $1',
        [id]
    );
    return result.rows[0] || null;
};

const createPatient = async ({ name, email, phone, address }) => {
    if (!name || !email) {
        const err = new Error('name and email are required');
        err.status = 400;
        throw err;
    }

    const existing = await query(
        'SELECT id FROM patients WHERE email = $1',
        [email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
        const err = new Error('Email already in use by another patient');
        err.status = 400;
        throw err;
    }

    const result = await query(
        `INSERT INTO patients (name, email, phone, address)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, phone, address, created_at`,
        [name, email.toLowerCase(), phone || null, address || null]
    );

    return result.rows[0];
};

const updatePatient = async (id, { name, email, phone, address }) => {
    const current = await getPatientById(id);
    if (!current) return null;

    if (email && email !== current.email) {
        const existing = await query(
            'SELECT id FROM patients WHERE email = $1 AND id != $2',
            [email.toLowerCase(), id]
        );
        if (existing.rows.length > 0) {
            const err = new Error('Email already in use by another patient');
            err.status = 400;
            throw err;
        }
    }

    const newName    = name    || current.name;
    const newEmail   = email   || current.email;
    const newPhone   = phone   !== undefined ? phone   : current.phone;
    const newAddress = address !== undefined ? address : current.address;

    const result = await query(
        `UPDATE patients
       SET name = $1, email = $2, phone = $3, address = $4
     WHERE id = $5
     RETURNING id, name, email, phone, address, created_at`,
        [newName, newEmail.toLowerCase(), newPhone, newAddress, id]
    );

    // Opcional: si cambias el email, podrías también actualizar Mongo más adelante

    return result.rows[0];
};

// ========== Mongo: historial de paciente (ya lo tenías) ==========

const getPatientHistory = async (email) => {
    const doc = await PatientHistory.findOne({ patientEmail: email.toLowerCase() }).lean();
    if (!doc) return null;

    const appts = doc.appointments || [];
    const totalSpent = appts.reduce((sum, a) => sum + (a.amountPaid || 0), 0);

    const freq = {};
    for (const a of appts) {
        freq[a.specialty] = (freq[a.specialty] || 0) + 1;
    }
    const mostFrequentSpecialty =
        Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    return {
        patient: { email: doc.patientEmail, name: doc.patientName },
        appointments: appts,
        summary: {
            totalAppointments: appts.length,
            totalSpent,
            mostFrequentSpecialty,
        },
    };
};

module.exports = {
    listPatients,
    getPatientById,
    createPatient,
    updatePatient,
    getPatientHistory,
};

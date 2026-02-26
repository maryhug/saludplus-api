const { query } = require('../config/postgres');
const { PatientHistory } = require('../config/mongodb');

const getDoctors = async (specialty = null) => {
    let sql    = 'SELECT id, name, email, specialty, created_at FROM doctors';
    const params = [];
    if (specialty) {
        sql += ' WHERE specialty ILIKE $1';
        params.push(`%${specialty}%`);
    }
    sql += ' ORDER BY name';
    const result = await query(sql, params);
    return result.rows;
};

const getDoctorById = async (id) => {
    const result = await query(
        'SELECT id, name, email, specialty, created_at FROM doctors WHERE id = $1',
        [id]
    );
    return result.rows[0] || null;
};

const updateDoctor = async (id, { name, email, specialty }) => {
    const current = await getDoctorById(id);
    if (!current) return null;

    if (email && email !== current.email) {
        const conflict = await query(
            'SELECT id FROM doctors WHERE email = $1 AND id != $2',
            [email, id]
        );
        if (conflict.rows.length > 0) {
            const err = new Error('Email already in use by another doctor');
            err.status = 400;
            throw err;
        }
    }

    const newName      = name      || current.name;
    const newEmail     = email     || current.email;
    const newSpecialty = specialty || current.specialty;

    const result = await query(
        'UPDATE doctors SET name=$1, email=$2, specialty=$3 WHERE id=$4 RETURNING *',
        [newName, newEmail, newSpecialty, id]
    );

    // Propagar cambios a MongoDB
    const updateFields = {};
    if (email && email !== current.email)
        updateFields['appointments.$[elem].doctorEmail'] = newEmail;
    if (name && name !== current.name)
        updateFields['appointments.$[elem].doctorName'] = newName;

    if (Object.keys(updateFields).length > 0) {
        await PatientHistory.updateMany(
            { 'appointments.doctorEmail': current.email },
            { $set: updateFields },
            { arrayFilters: [{ 'elem.doctorEmail': current.email }] }
        );
    }

    return result.rows[0];
};

const createDoctor = async ({ name, email, specialty }) => {
    if (!name || !email || !specialty) {
        const err = new Error('name, email and specialty are required');
        err.status = 400;
        throw err;
    }

    // Verificar email único
    const existing = await query(
        'SELECT id FROM doctors WHERE email = $1',
        [email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
        const err = new Error('Email already in use by another doctor');
        err.status = 400;
        throw err;
    }

    const result = await query(
        `INSERT INTO doctors (name, email, specialty)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, specialty, created_at`,
        [name, email.toLowerCase(), specialty]
    );

    return result.rows[0];
};

const deleteDoctor = async (id) => {
    // Verificar que no tenga citas asociadas
    const appts = await query(
        'SELECT COUNT(*) AS count FROM appointments WHERE doctor_id = $1',
        [id]
    );
    const count = parseInt(appts.rows[0].count);
    if (count > 0) {
        const err = new Error('Doctor has related appointments and cannot be deleted');
        err.status = 400;
        throw err;
    }

    const result = await query(
        'DELETE FROM doctors WHERE id = $1 RETURNING id, name, email, specialty',
        [id]
    );
    return result.rows[0] || null;
};

module.exports = {
    getDoctors,
    getDoctorById,
    updateDoctor,
    createDoctor,
    deleteDoctor,
};
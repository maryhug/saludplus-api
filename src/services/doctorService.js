// src/services/doctorService.js

// Importa la función query para interactuar con PostgreSQL.
const { query } = require('../config/postgres');
// Importa el modelo de historial de pacientes en MongoDB, para propagar cambios.
const { PatientHistory } = require('../config/mongodb');

// Obtiene la lista de doctores, opcionalmente filtrada por especialidad.
const getDoctors = async (specialty = null) => {
    let sql    = 'SELECT id, name, email, specialty, created_at FROM doctors';
    const params = [];
    if (specialty) {
        // Si viene una especialidad, se agrega un WHERE con ILIKE para búsqueda case-insensitive.
        sql += ' WHERE specialty ILIKE $1';
        params.push(`%${specialty}%`);
    }
    sql += ' ORDER BY name';
    const result = await query(sql, params);
    return result.rows;
};

// Obtiene un doctor específico por su id.
const getDoctorById = async (id) => {
    const result = await query(
        'SELECT id, name, email, specialty, created_at FROM doctors WHERE id = $1',
        [id]
    );
    return result.rows[0] || null;
};

// Actualiza datos de un doctor y sincroniza cambios relevantes en MongoDB.
const updateDoctor = async (id, { name, email, specialty }) => {
    // Primero se obtiene el estado actual para validar existencia y comparar cambios.
    const current = await getDoctorById(id);
    if (!current) return null;

    // Si se cambia el email, se verifica que no esté en uso por otro doctor.
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

    // Construye los nuevos valores usando los existentes como fallback.
    const newName      = name      || current.name;
    const newEmail     = email     || current.email;
    const newSpecialty = specialty || current.specialty;

    // Actualiza el registro del doctor en PostgreSQL.
    const result = await query(
        'UPDATE doctors SET name=$1, email=$2, specialty=$3 WHERE id=$4 RETURNING *',
        [newName, newEmail, newSpecialty, id]
    );

    // Propagar cambios a MongoDB:
    // si se modifican nombre o email del doctor, los reflejamos en las citas embebidas.
    const updateFields = {};
    if (email && email !== current.email)
        updateFields['appointments.$[elem].doctorEmail'] = newEmail;
    if (name && name !== current.name)
        updateFields['appointments.$[elem].doctorName'] = newName;

    // Solo ejecuta el update en Mongo si hay algo que actualizar.
    if (Object.keys(updateFields).length > 0) {
        await PatientHistory.updateMany(
            { 'appointments.doctorEmail': current.email },
            { $set: updateFields },
            { arrayFilters: [{ 'elem.doctorEmail': current.email }] }
        );
    }

    return result.rows[0];
};

// Crea un nuevo doctor, validando campos obligatorios y unicidad del email.
const createDoctor = async ({ name, email, specialty }) => {
    if (!name || !email || !specialty) {
        const err = new Error('name, email and specialty are required');
        err.status = 400;
        throw err;
    }

    // Verificar que el email no exista ya en la tabla doctors.
    const existing = await query(
        'SELECT id FROM doctors WHERE email = $1',
        [email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
        const err = new Error('Email already in use by another doctor');
        err.status = 400;
        throw err;
    }

    // Inserta el nuevo doctor y devuelve los campos principales.
    const result = await query(
        `INSERT INTO doctors (name, email, specialty)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, specialty, created_at`,
        [name, email.toLowerCase(), specialty]
    );

    return result.rows[0];
};

// Elimina un doctor, siempre que no tenga citas asociadas.
const deleteDoctor = async (id) => {
    // Primero se verifica si tiene citas relacionadas en appointments.
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

    // Si no tiene citas, se procede a eliminarlo.
    const result = await query(
        'DELETE FROM doctors WHERE id = $1 RETURNING id, name, email, specialty',
        [id]
    );
    return result.rows[0] || null;
};

// Exporta todas las funciones del servicio para usarlas en las rutas.
module.exports = {
    getDoctors,
    getDoctorById,
    updateDoctor,
    createDoctor,
    deleteDoctor,
};

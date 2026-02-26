// src/services/patientService.js

// Importa la función query para trabajar con la tabla patients en PostgreSQL.
const { query } = require('../config/postgres.js');
// Importa el modelo de MongoDB donde se almacena el historial clínico.
const { PatientHistory } = require('../config/mongodb.js');

// ========== SQL: CRUD patients ==========

// Lista todos los pacientes ordenados por nombre.
const listPatients = async () => {
    const result = await query(
        'SELECT id, name, email, phone, address, created_at FROM patients ORDER BY name'
    );
    return result.rows;
};

// Obtiene un paciente específico por su id.
const getPatientById = async (id) => {
    const result = await query(
        'SELECT id, name, email, phone, address, created_at FROM patients WHERE id = $1',
        [id]
    );
    return result.rows[0] || null;
};

// Crea un paciente nuevo con validaciones de negocio.
const createPatient = async ({ name, email, phone, address }) => {
    // name y email son obligatorios.
    if (!name || !email) {
        const err = new Error('name and email are required');
        err.status = 400;
        throw err;
    }

    // Verifica unicidad del email en la tabla patients.
    const existing = await query(
        'SELECT id FROM patients WHERE email = $1',
        [email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
        const err = new Error('Email already in use by another patient');
        err.status = 400;
        throw err;
    }

    // Inserta el nuevo paciente y devuelve sus datos principales.
    const result = await query(
        `INSERT INTO patients (name, email, phone, address)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, phone, address, created_at`,
        [name, email.toLowerCase(), phone || null, address || null]
    );

    return result.rows[0];
};

// Actualiza los datos de un paciente existente.
const updatePatient = async (id, { name, email, phone, address }) => {
    // Obtiene el estado actual para validar existencia y posibles conflictos de email.
    const current = await getPatientById(id);
    if (!current) return null;

    // Si se quiere cambiar el email, se valida que no esté en uso por otro paciente.
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

    // Toma los nuevos valores o, si no se envían, mantiene los actuales.
    const newName    = name    || current.name;
    const newEmail   = email   || current.email;
    const newPhone   = phone   !== undefined ? phone   : current.phone;
    const newAddress = address !== undefined ? address : current.address;

    // Actualiza el registro en PostgreSQL.
    const result = await query(
        `UPDATE patients
       SET name = $1, email = $2, phone = $3, address = $4
     WHERE id = $5
     RETURNING id, name, email, phone, address, created_at`,
        [newName, newEmail.toLowerCase(), newPhone, newAddress, id]
    );

    // Nota: aquí podrías extender la lógica para sincronizar cambios de email en MongoDB.

    return result.rows[0];
};

// ========== Mongo: historial de paciente ==========

// Recupera el historial clínico de un paciente desde MongoDB usando su email.
const getPatientHistory = async (email) => {
    // Busca el documento de historial por patientEmail.
    const doc = await PatientHistory.findOne({ patientEmail: email.toLowerCase() }).lean();
    if (!doc) return null;

    const appts = doc.appointments || [];

    // Calcula el total gastado por el paciente sumando amountPaid de cada cita.
    const totalSpent = appts.reduce((sum, a) => sum + (a.amountPaid || 0), 0);

    // Calcula la especialidad más frecuente entre sus citas.
    const freq = {};
    for (const a of appts) {
        freq[a.specialty] = (freq[a.specialty] || 0) + 1;
    }
    const mostFrequentSpecialty =
        Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Devuelve tanto el detalle del historial como un pequeño resumen.
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

// Exporta las funciones del servicio para ser usadas por las rutas.
module.exports = {
    listPatients,
    getPatientById,
    createPatient,
    updatePatient,
    getPatientHistory,
};

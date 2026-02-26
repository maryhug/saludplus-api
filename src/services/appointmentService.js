// src/services/appointmentService.js

// Importa la función query para trabajar con PostgreSQL.
const { query } = require('../config/postgres');
// Importa el modelo de MongoDB donde se guarda el historial del paciente.
const { PatientHistory } = require('../config/mongodb');

// Crear cita nueva
const createAppointment = async ({
                                     appointment_id,
                                     appointment_date,
                                     patient_id,
                                     doctor_id,
                                     treatment_id,
                                     insurance_id,
                                     amount_paid,
                                 }) => {
    // Validación básica de campos obligatorios.
    if (
        !appointment_id ||
        !appointment_date ||
        !patient_id ||
        !doctor_id ||
        !treatment_id ||
        !insurance_id ||
        amount_paid === undefined
    ) {
        const err = new Error('All fields are required');
        err.status = 400;
        throw err;
    }

    // Validación de tipo y rango para amount_paid.
    const numericAmount = Number(amount_paid);
    if (Number.isNaN(numericAmount) || numericAmount < 0) {
        const err = new Error('amount_paid must be a non-negative number');
        err.status = 400;
        throw err;
    }

    // Validar llaves foráneas en PostgreSQL antes de insertar la cita.
    // Se consultan paciente, doctor, tratamiento y seguro en paralelo.
    const [patientRes, doctorRes, treatmentRes, insuranceRes] = await Promise.all([
        query('SELECT id, name, email FROM patients WHERE id = $1', [patient_id]),
        query('SELECT id, name, email, specialty FROM doctors WHERE id = $1', [doctor_id]),
        query('SELECT id, code, description, cost FROM treatments WHERE id = $1', [treatment_id]),
        query('SELECT id, name, coverage_percentage FROM insurances WHERE id = $1', [insurance_id]),
    ]);

    const patient = patientRes.rows[0];
    const doctor = doctorRes.rows[0];
    const treatment = treatmentRes.rows[0];
    const insurance = insuranceRes.rows[0];

    // Si alguna FK no existe, se lanza un error 400 específico.
    if (!patient)  { const e = new Error('Invalid patient_id');  e.status = 400; throw e; }
    if (!doctor)   { const e = new Error('Invalid doctor_id');   e.status = 400; throw e; }
    if (!treatment){ const e = new Error('Invalid treatment_id');e.status = 400; throw e; }
    if (!insurance){ const e = new Error('Invalid insurance_id');e.status = 400; throw e; }

    // Insertar la cita en PostgreSQL (sistema transaccional normalizado).
    const insertRes = await query(
        `INSERT INTO appointments
       (appointment_id, appointment_date, patient_id, doctor_id,
        treatment_id, insurance_id, amount_paid)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, appointment_id, appointment_date,
               patient_id, doctor_id, treatment_id, insurance_id,
               amount_paid, created_at`,
        [
            appointment_id,
            appointment_date,
            patient_id,
            doctor_id,
            treatment_id,
            insurance_id,
            numericAmount,
        ]
    );

    const appointment = insertRes.rows[0];

    // Construye el objeto de cita que se va a guardar en el historial de MongoDB.
    // Aquí se "desnormaliza": se copian datos del doctor, tratamiento y seguro
    // para tener el historial listo para consulta sin joins.
    const email = patient.email.toLowerCase();
    const historyAppointment = {
        appointmentId:        appointment.appointment_id,
        // Se formatea la fecha a YYYY-MM-DD.
        date:                 appointment.appointment_date.toISOString().slice(0, 10),
        doctorName:           doctor.name,
        doctorEmail:          doctor.email,
        specialty:            doctor.specialty,
        treatmentCode:        treatment.code,
        treatmentDescription: treatment.description,
        treatmentCost:        Number(treatment.cost),
        insuranceProvider:    insurance.name,
        coveragePercentage:   Number(insurance.coverage_percentage),
        amountPaid:           numericAmount,
    };

    // Actualizar historial en Mongo:
    // - Si no existe el documento del paciente, lo crea (upsert: true).
    // - Siempre agrega la nueva cita al arreglo appointments.
    await PatientHistory.findOneAndUpdate(
        { patientEmail: email },
        {
            $setOnInsert: { patientEmail: email, patientName: patient.name },
            $push: { appointments: historyAppointment },
        },
        { upsert: true, new: true }
    );

    // Devuelve la cita creada y las entidades relacionadas (útil para la respuesta del endpoint).
    return {
        appointment,
        patient,
        doctor,
        treatment,
        insurance,
    };
};

module.exports = { createAppointment };

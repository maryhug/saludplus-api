const fs   = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { query, initSchema, pool } = require('../config/postgres');
const { PatientHistory } = require('../config/mongodb');
const { CSV_PATH } = require('../config/env');

const capitalize = str =>
    str ? str.trim().split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ')
        : '';

const migrate = async ({ clearBefore = false } = {}) => {
    const csvPath = path.resolve(CSV_PATH);
    if (!fs.existsSync(csvPath)) throw new Error(`CSV not found at: ${csvPath}`);

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const rows = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });

    await initSchema();

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (clearBefore) {
            // Orden importante: primero la tabla que tiene FKs
            await client.query('DELETE FROM appointments');
            await client.query('DELETE FROM treatments');
            await client.query('DELETE FROM patients');
            await client.query('DELETE FROM doctors');
            await client.query('DELETE FROM insurances');
            await PatientHistory.deleteMany({});
            console.log('🗑️  Previous data cleared');
        }

        // ── Extraer entidades únicas del CSV ──────────────────────────

        const patientsMap   = new Map(); // key: email
        const doctorsMap    = new Map(); // key: email
        const insurancesMap = new Map(); // key: name
        const treatmentsMap = new Map(); // key: code  ← NUEVO

        for (const row of rows) {
            // Patients
            const pEmail = row.patient_email.toLowerCase().trim();
            if (!patientsMap.has(pEmail)) {
                patientsMap.set(pEmail, {
                    name:    capitalize(row.patient_name),
                    email:   pEmail,
                    phone:   row.patient_phone?.trim()   || null,
                    address: row.patient_address?.trim() || null,
                });
            }

            // Doctors
            const dEmail = row.doctor_email.toLowerCase().trim();
            if (!doctorsMap.has(dEmail)) {
                doctorsMap.set(dEmail, {
                    name:      capitalize(row.doctor_name),
                    email:     dEmail,
                    specialty: row.specialty?.trim() || '',
                });
            }

            // Insurances (incluye "SinSeguro" con 0%)
            const ins = row.insurance_provider?.trim();
            if (ins && !insurancesMap.has(ins)) {
                insurancesMap.set(ins, {
                    name:                ins,
                    coverage_percentage: parseFloat(row.coverage_percentage) || 0,
                });
            }

            // Treatments ← NUEVO: código único con descripción y costo
            const tCode = row.treatment_code?.trim();
            if (tCode && !treatmentsMap.has(tCode)) {
                treatmentsMap.set(tCode, {
                    code:        tCode,
                    description: row.treatment_description?.trim() || '',
                    cost:        parseFloat(row.treatment_cost) || 0,
                });
            }
        }

        // ── UPSERT patients ───────────────────────────────────────────
        const patientIdMap = new Map();
        for (const p of patientsMap.values()) {
            const res = await client.query(
                `INSERT INTO patients (name, email, phone, address)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE
           SET name = $1, phone = $3, address = $4
         RETURNING id`,
                [p.name, p.email, p.phone, p.address]
            );
            patientIdMap.set(p.email, res.rows[0].id);
        }
        console.log(`👤 Patients upserted: ${patientsMap.size}`);

        // ── UPSERT doctors ────────────────────────────────────────────
        const doctorIdMap = new Map();
        for (const d of doctorsMap.values()) {
            const res = await client.query(
                `INSERT INTO doctors (name, email, specialty)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE
           SET name = $1, specialty = $3
         RETURNING id`,
                [d.name, d.email, d.specialty]
            );
            doctorIdMap.set(d.email, res.rows[0].id);
        }
        console.log(`👨‍⚕️ Doctors upserted: ${doctorsMap.size}`);

        // ── UPSERT insurances ─────────────────────────────────────────
        const insuranceIdMap = new Map();
        for (const i of insurancesMap.values()) {
            const res = await client.query(
                `INSERT INTO insurances (name, coverage_percentage)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE
           SET coverage_percentage = $2
         RETURNING id`,
                [i.name, i.coverage_percentage]
            );
            insuranceIdMap.set(i.name, res.rows[0].id);
        }
        console.log(`🏥 Insurances upserted: ${insurancesMap.size}`);

        // ── UPSERT treatments ← NUEVO ─────────────────────────────────
        const treatmentIdMap = new Map();
        for (const t of treatmentsMap.values()) {
            const res = await client.query(
                `INSERT INTO treatments (code, description, cost)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE
           SET description = $2, cost = $3
         RETURNING id`,
                [t.code, t.description, t.cost]
            );
            treatmentIdMap.set(t.code, res.rows[0].id);
        }
        console.log(`💊 Treatments upserted: ${treatmentsMap.size}`);

        // ── INSERT appointments ───────────────────────────────────────
        let appointmentCount = 0;
        for (const row of rows) {
            const patientId   = patientIdMap.get(row.patient_email.toLowerCase().trim());
            const doctorId    = doctorIdMap.get(row.doctor_email.toLowerCase().trim());
            const insuranceId = insuranceIdMap.get(row.insurance_provider?.trim());
            const treatmentId = treatmentIdMap.get(row.treatment_code?.trim());

            // Validar que todas las FKs existen antes de insertar
            if (!patientId || !doctorId || !insuranceId || !treatmentId) {
                console.warn(`⚠️  Skipping ${row.appointment_id}: missing FK reference`);
                continue;
            }

            await client.query(
                `INSERT INTO appointments
           (appointment_id, appointment_date, patient_id, doctor_id,
            treatment_id, insurance_id, amount_paid)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (appointment_id) DO NOTHING`,
                [
                    row.appointment_id,
                    row.appointment_date,
                    patientId,
                    doctorId,
                    treatmentId,    // ← FK a treatments
                    insuranceId,    // ← NOT NULL, siempre presente
                    parseFloat(row.amount_paid),
                ]
            );
            appointmentCount++;
        }
        console.log(`📅 Appointments inserted: ${appointmentCount}`);

        await client.query('COMMIT');

        // ── MongoDB: construir historiales de pacientes ───────────────
        const historiesMap = new Map();
        for (const row of rows) {
            const email = row.patient_email.toLowerCase().trim();
            if (!historiesMap.has(email)) {
                historiesMap.set(email, {
                    patientEmail: email,
                    patientName:  capitalize(row.patient_name),
                    appointments: [],
                });
            }
            historiesMap.get(email).appointments.push({
                appointmentId:        row.appointment_id,
                date:                 row.appointment_date,
                doctorName:           capitalize(row.doctor_name),
                doctorEmail:          row.doctor_email.toLowerCase().trim(),
                specialty:            row.specialty?.trim(),
                treatmentCode:        row.treatment_code,
                treatmentDescription: row.treatment_description,
                treatmentCost:        parseFloat(row.treatment_cost),
                insuranceProvider:    row.insurance_provider?.trim(),
                coveragePercentage:   parseFloat(row.coverage_percentage) || 0,
                amountPaid:           parseFloat(row.amount_paid),
            });
        }

        for (const history of historiesMap.values()) {
            await PatientHistory.findOneAndUpdate(
                { patientEmail: history.patientEmail },
                { $set: history },
                { upsert: true, new: true }
            );
        }
        console.log(`📋 Patient histories upserted: ${historiesMap.size}`);

        return {
            patients:     patientsMap.size,
            doctors:      doctorsMap.size,
            insurances:   insurancesMap.size,
            treatments:   treatmentsMap.size,   // ← nuevo en el reporte
            appointments: appointmentCount,
            histories:    historiesMap.size,
            csvPath:      CSV_PATH,
        };

    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

module.exports = { migrate };

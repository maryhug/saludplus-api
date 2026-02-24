const { Pool } = require('pg');
const { DATABASE_URL } = require('./env');

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

const query = (text, params) => pool.query(text, params);

const initSchema = async () => {
    await pool.query(`
    -- =============================================
    -- SaludPlus - PostgreSQL Schema (3NF)
    -- Idempotente: puede ejecutarse múltiples veces
    -- =============================================

    CREATE TABLE IF NOT EXISTS patients (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(255) NOT NULL,
      email       VARCHAR(255) UNIQUE NOT NULL,
      phone       VARCHAR(20),
      address     TEXT,
      created_at  TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS doctors (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(255) NOT NULL,
      email       VARCHAR(255) UNIQUE NOT NULL,
      specialty   VARCHAR(100) NOT NULL,
      created_at  TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS insurances (
      id                  SERIAL PRIMARY KEY,
      name                VARCHAR(255) UNIQUE NOT NULL,
      coverage_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
      created_at          TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS treatments (
      id          SERIAL PRIMARY KEY,
      code        VARCHAR(20) UNIQUE NOT NULL,
      description VARCHAR(255) NOT NULL,
      cost        NUMERIC(12,2) NOT NULL,
      created_at  TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id               SERIAL PRIMARY KEY,
      appointment_id   VARCHAR(20) UNIQUE NOT NULL,
      appointment_date DATE NOT NULL,
      patient_id       INTEGER NOT NULL REFERENCES patients(id)    ON DELETE RESTRICT,
      doctor_id        INTEGER NOT NULL REFERENCES doctors(id)     ON DELETE RESTRICT,
      treatment_id     INTEGER NOT NULL REFERENCES treatments(id)  ON DELETE RESTRICT,
      insurance_id     INTEGER NOT NULL REFERENCES insurances(id)  ON DELETE RESTRICT,
      amount_paid      NUMERIC(12,2) NOT NULL,
      created_at       TIMESTAMP DEFAULT NOW()
    );

    -- =============================================
    -- Índices para consultas frecuentes
    -- =============================================
    CREATE INDEX IF NOT EXISTS idx_patients_email    ON patients(email);
    CREATE INDEX IF NOT EXISTS idx_doctors_email     ON doctors(email);
    CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty);
    CREATE INDEX IF NOT EXISTS idx_appt_patient_id  ON appointments(patient_id);
    CREATE INDEX IF NOT EXISTS idx_appt_doctor_id   ON appointments(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_appt_date        ON appointments(appointment_date);
    CREATE INDEX IF NOT EXISTS idx_appt_insurance_id ON appointments(insurance_id);
  `);
    console.log('✅ PostgreSQL schema ready (3NF)');
};

module.exports = { query, initSchema, pool };

// src/config/postgres.js

// Importa Pool desde la librería pg para manejar el pool de conexiones a PostgreSQL.
const { Pool } = require('pg');
// Importa la URL de la base de datos desde la configuración de entorno.
const { DATABASE_URL } = require('./env');

// Crea un pool de conexiones reutilizable para toda la aplicación.
// ssl: { rejectUnauthorized: false } se usa típicamente en servicios como Render/Heroku.
const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Función auxiliar para ejecutar consultas directamente usando el pool.
// La usarán los servicios/repositorios para interactuar con PostgreSQL.
const query = (text, params) => pool.query(text, params);

// Función que inicializa el esquema en PostgreSQL.
// Es idempotente: se puede ejecutar varias veces sin duplicar tablas ni romper el esquema.
const initSchema = async () => {
    await pool.query(`
    -- =============================================
    -- SaludPlus - PostgreSQL Schema (3NF)
    -- Idempotente: puede ejecutarse múltiples veces
    -- =============================================

    -- Tabla de pacientes: datos básicos de identificación y contacto.
    CREATE TABLE IF NOT EXISTS patients (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(255) NOT NULL,
      email       VARCHAR(255) UNIQUE NOT NULL,
      phone       VARCHAR(20),
      address     TEXT,
      created_at  TIMESTAMP DEFAULT NOW()
    );

    -- Tabla de doctores: cada doctor con su especialidad.
    CREATE TABLE IF NOT EXISTS doctors (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(255) NOT NULL,
      email       VARCHAR(255) UNIQUE NOT NULL,
      specialty   VARCHAR(100) NOT NULL,
      created_at  TIMESTAMP DEFAULT NOW()
    );

    -- Tabla de aseguradoras/seguros médicos.
    CREATE TABLE IF NOT EXISTS insurances (
      id                  SERIAL PRIMARY KEY,
      name                VARCHAR(255) UNIQUE NOT NULL,
      coverage_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
      created_at          TIMESTAMP DEFAULT NOW()
    );

    -- Tabla de tratamientos, separados de las citas para evitar duplicar descripciones y costos.
    CREATE TABLE IF NOT EXISTS treatments (
      id          SERIAL PRIMARY KEY,
      code        VARCHAR(20) UNIQUE NOT NULL,
      description VARCHAR(255) NOT NULL,
      cost        NUMERIC(12,2) NOT NULL,
      created_at  TIMESTAMP DEFAULT NOW()
    );

    -- Tabla de citas (appointments) que relaciona pacientes, doctores, tratamientos y seguros.
    CREATE TABLE IF NOT EXISTS appointments (
      id               SERIAL PRIMARY KEY,
      appointment_id   VARCHAR(20) UNIQUE NOT NULL,             -- ID de la cita según el CSV/sistema origen.
      appointment_date DATE NOT NULL,                           -- Fecha de la cita.
      patient_id       INTEGER NOT NULL REFERENCES patients(id)    ON DELETE RESTRICT,
      doctor_id        INTEGER NOT NULL REFERENCES doctors(id)     ON DELETE RESTRICT,
      treatment_id     INTEGER NOT NULL REFERENCES treatments(id)  ON DELETE RESTRICT,
      insurance_id     INTEGER NOT NULL REFERENCES insurances(id)  ON DELETE RESTRICT,
      amount_paid      NUMERIC(12,2) NOT NULL,                  -- Monto final pagado después de cobertura.
      created_at       TIMESTAMP DEFAULT NOW()
    );

    -- =============================================
    -- Índices para consultas frecuentes
    -- =============================================
    -- Índices que optimizan búsquedas por email, especialidad, paciente, doctor, fecha y seguro.
    CREATE INDEX IF NOT EXISTS idx_patients_email    ON patients(email);
    CREATE INDEX IF NOT EXISTS idx_doctors_email     ON doctors(email);
    CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty);
    CREATE INDEX IF NOT EXISTS idx_appt_patient_id   ON appointments(patient_id);
    CREATE INDEX IF NOT EXISTS idx_appt_doctor_id    ON appointments(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_appt_date         ON appointments(appointment_date);
    CREATE INDEX IF NOT EXISTS idx_appt_insurance_id ON appointments(insurance_id);
  `);
    console.log('✅ PostgreSQL schema ready (3NF)');
};

// Exporta la función query para uso general, initSchema para inicializar,
// y el pool por si se necesita acceder directamente a la conexión.
module.exports = { query, initSchema, pool };

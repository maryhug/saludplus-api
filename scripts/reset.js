// Carga las variables de entorno desde el archivo .env.
// Esto permite usar, por ejemplo, las credenciales de PostgreSQL y MongoDB sin hardcodearlas.
require('dotenv').config();

// Importa el pool de conexiones de PostgreSQL desde la configuración central.
// pool nos permite ejecutar consultas y manejar conexiones a la base relacional.
const { pool }    = require('../src/config/postgres');

// Importa la función de conexión a MongoDB y el modelo PatientHistory.
// connect se encarga de abrir la conexión, y PatientHistory representa la colección de historias clínicas.
const { connect, PatientHistory } = require('../src/config/mongodb');

// Función principal que hace el "reset" de ambas bases de datos.
const reset = async () => {
    console.log('🔌 Connecting to databases...');
    // Primero se asegura de conectar a MongoDB (y también a PostgreSQL a través del pool).
    await connect();
    console.log('');

    // ── PostgreSQL: borrar tablas en orden (respetar FKs) ─────────
    console.log('🗑️  Dropping PostgreSQL tables...');
    // Obtenemos un cliente del pool para ejecutar múltiples queries como una sesión.
    const client = await pool.connect();
    try {
        // Eliminamos las tablas en un orden que respete las llaves foráneas.
        // CASCADE asegura que si hay dependencias, también se eliminen sin errores.
        await client.query(`
      DROP TABLE IF EXISTS appointments CASCADE;
      DROP TABLE IF EXISTS treatments   CASCADE;
      DROP TABLE IF EXISTS patients     CASCADE;
      DROP TABLE IF EXISTS doctors      CASCADE;
      DROP TABLE IF EXISTS insurances   CASCADE;
    `);
        console.log('✅ PostgreSQL: all tables dropped');
    } finally {
        // Liberamos el cliente para que el pool no quede bloqueado…
        client.release();
        // …y cerramos completamente el pool porque este script termina aquí.
        await pool.end();
    }

    // ── MongoDB: borrar colección ─────────────────────────────────
    console.log('🗑️  Dropping MongoDB collections...');
    // Intentamos borrar la colección donde se guardan las historias clínicas de los pacientes.
    await PatientHistory.collection.drop().catch(err => {
        // Si la colección no existe, lo tomamos como un caso normal y solo mostramos un mensaje informativo.
        if (err.message === 'ns not found') {
            console.log('ℹ️  MongoDB: collection did not exist (skipping)');
        } else {
            // Si el error es otro, sí lo propagamos para que el script falle.
            throw err;
        }
    });
    console.log('✅ MongoDB: patienthistories collection dropped');

    console.log('');
    // Mensaje final indicando que ambas bases quedaron limpias.
    console.log('🧹 Reset complete. Both databases are clean.');
    // Sugerencia al desarrollador para el siguiente paso: levantar el servidor y recrear el esquema.
    console.log('💡 Run "npm run dev" to recreate schema automatically.');
    // Terminamos el proceso de Node de forma explícita con código 0 (éxito).
    process.exit(0);
};

// Ejecutamos la función reset y, si algo falla, lo capturamos aquí.
reset().catch(err => {
    console.error('❌ Reset failed:', err.message);
    // Si hay error, salimos con código 1 (indica fallo del script).
    process.exit(1);
});

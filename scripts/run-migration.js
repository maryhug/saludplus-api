// scripts/run-migration.js

// Carga las variables de entorno desde .env para poder usar las URLs y credenciales
// de PostgreSQL y MongoDB sin escribirlas directamente en el código.
require('dotenv').config();

// Importa la función principal de migración.
// migrate se encargará de leer los CSV, limpiar datos y poblar ambas bases de datos.
const { migrate }   = require('../src/services/migrationService');

// Importa la función que inicializa el esquema en PostgreSQL.
// initSchema crea las tablas y relaciones si no existen.
const { initSchema } = require('../src/config/postgres');

// Importa la función de conexión a MongoDB, renombrada a connectMongo para mayor claridad.
const { connect: connectMongo } = require('../src/config/mongodb');

// Función principal que ejecuta la migración completa.
const run = async () => {
    console.log('🔌 Connecting to databases...');
    // Primero abre la conexión a MongoDB.
    await connectMongo();
    // Luego se asegura de que el esquema de PostgreSQL esté creado.
    await initSchema();

    console.log('📦 Starting migration...');
    // Ejecuta la migración indicando clearBefore: true,
    // lo que normalmente significa limpiar datos previos antes de insertar los nuevos.
    const result = await migrate({ clearBefore: true });

    // Muestra un resumen del resultado de la migración (por ejemplo, conteo de registros migrados).
    console.log('✅ Migration completed:', result);

    // Termina el proceso de Node con código 0 (éxito).
    process.exit(0);
};

// Ejecuta la función run y maneja cualquier error de forma global.
run().catch(err => {
    // Si ocurre un error, se muestra en consola y se sale con código 1 (fallo).
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
});

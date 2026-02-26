// src/config/env.js

// Carga las variables de entorno definidas en el archivo .env.
// Esto permite configurar el proyecto sin cambiar el código fuente.
require('dotenv').config();

// Exporta un objeto con todas las variables de configuración que usará la app.
// Aquí centralizas puertos, URLs de bases de datos y rutas de archivos CSV.
module.exports = {
    // Puerto en el que se levanta el servidor Express.
    // Si no hay PORT en .env, usa 3000 por defecto.
    PORT: process.env.PORT || 3000,

    // URL de conexión a PostgreSQL (incluye usuario, contraseña, host, base de datos).
    DATABASE_URL: process.env.DATABASE_URL,

    // URI de conexión a MongoDB; si no se define, usa un Mongo local.
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017',

    // Nombre de la base de datos de MongoDB utilizada para la aplicación.
    MONGODB_DB: process.env.MONGODB_DB || 'saludplus',

    // Ruta al archivo CSV que se usará para la migración de datos.
    // Se puede sobrescribir con SIMULACRO_CSV_PATH en el .env.
    CSV_PATH: process.env.SIMULACRO_CSV_PATH || './data/simulacro_saludplus_data.csv',
};

// server.js

// Carga las variables de entorno desde el archivo .env (puerto, URLs de BD, etc.).
require('dotenv').config();

// Importa la aplicación Express ya configurada con rutas y middlewares.
const app           = require('./app');

// Importa la función que inicializa el esquema de PostgreSQL (crea tablas e índices si no existen).
const { initSchema } = require('./config/postgres');

// Importa la función de conexión a MongoDB, renombrada como connectMongo por claridad.
const { connect: connectMongo } = require('./config/mongodb');

// Importa el puerto configurado para el servidor HTTP.
const { PORT }       = require('./config/env');

// Función de arranque de la aplicación: conecta a las bases de datos y levanta el servidor.
const start = async () => {
    try {
        // Abre la conexión con MongoDB (para historiales de pacientes).
        await connectMongo();
        // Se asegura de que el esquema de PostgreSQL esté listo (3FN).
        await initSchema();
        // Inicia el servidor Express escuchando en el puerto configurado.
        app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
    } catch (err) {
        // Si algo falla al iniciar (conexión a BD, esquema, etc.), se muestra el error y se termina el proceso.
        console.error('❌ Startup error:', err.message);
        process.exit(1);
    }
};

// Ejecuta la función de arranque.
start();

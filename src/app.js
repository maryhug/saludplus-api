// app.js

// Importa Express para crear la aplicación HTTP y CORS para permitir peticiones desde otros orígenes.
const express = require('express');
const cors    = require('cors');

// Crea la instancia principal de la aplicación Express.
const app = express();

// Middleware global de CORS: permite que el frontend (por ejemplo, en otro dominio/puerto)
// consuma esta API sin problemas de política de origen cruzado.
app.use(cors());

// Middleware para parsear automáticamente JSON en el body de las peticiones.
app.use(express.json());

// Monta los routers de cada módulo bajo un prefijo /api.
// Cada archivo en routes/* organiza los endpoints de un dominio específico.
app.use('/api/simulacro',   require('./routes/simulacro'));
app.use('/api/doctors',     require('./routes/doctors'));
app.use('/api/reports',     require('./routes/reports'));
app.use('/api/patients',    require('./routes/patients'));
app.use('/api/treatments',  require('./routes/treatments'));
app.use('/api/insurances',  require('./routes/insurances'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/status', require('./routes/status'));


// Manejador 404 genérico: si ninguna ruta anterior respondió,
// se devuelve un JSON estándar indicando que la ruta no existe.
app.use((req, res) => res.status(404).json({ ok: false, error: 'Route not found' }));

// Exporta la app para que index.js (o server.js) la use para levantar el servidor.
module.exports = app;

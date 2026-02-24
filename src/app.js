const express = require('express');
const cors    = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/simulacro', require('./routes/simulacro'));
app.use('/api/doctors',   require('./routes/doctors'));
app.use('/api/reports',   require('./routes/reports'));
app.use('/api/patients',  require('./routes/patients'));

// 404 handler
app.use((req, res) => res.status(404).json({ ok: false, error: 'Route not found' }));

module.exports = app;

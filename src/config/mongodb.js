// src/config/mongodb.js

// Importa mongoose, la librería ODM para trabajar con MongoDB desde Node.js.
const mongoose = require('mongoose');
// Importa la configuración de conexión (URI y nombre de la base de datos) desde env.js.
const { MONGODB_URI, MONGODB_DB } = require('./env');

// Función encargada de abrir la conexión a MongoDB.
const connect = async () => {
    // Usamos dbName como opción separada para evitar problemas de rutas en la URI.
    // Aquí se establece la conexión global de mongoose que usará toda la app.
    await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB });
    console.log('MongoDB connected');
};

// Esquema embebido para las citas (appointments) dentro del documento de historial del paciente.
// Cada cita guarda información consolidada: datos del médico, tratamiento, seguro, etc.
const appointmentEmbedSchema = new mongoose.Schema({
    appointmentId:        { type: String },  // ID de la cita en el sistema relacional.
    date:                 { type: String },  // Fecha de la cita.
    doctorName:           { type: String },  // Nombre del médico.
    doctorEmail:          { type: String },  // Correo del médico.
    specialty:            { type: String },  // Especialidad del médico.
    treatmentCode:        { type: String },  // Código del tratamiento aplicado.
    treatmentDescription: { type: String },  // Descripción del tratamiento.
    treatmentCost:        { type: Number },  // Costo total del tratamiento.
    insuranceProvider:    { type: String },  // Nombre de la aseguradora.
    coveragePercentage:   { type: Number },  // Porcentaje de cobertura del seguro.
    amountPaid:           { type: Number },  // Monto efectivamente pagado por el paciente.
}, { _id: false }); // _id: false evita que mongoose genere un _id para cada subdocumento embebido.

// Esquema principal para el historial del paciente.
// Un documento por paciente, con su email y todas sus citas embebidas en un arreglo.
const patientHistorySchema = new mongoose.Schema({
    // Email del paciente: es la clave única para identificar su historial.
    patientEmail: { type: String, unique: true, required: true, index: true },
    // Nombre del paciente, usado para consultas y reportes.
    patientName:  { type: String },
    // Arreglo de citas embebidas usando el esquema definido arriba.
    appointments: [appointmentEmbedSchema],
}, { timestamps: true }); // timestamps agrega createdAt y updatedAt automáticamente.

// Modelo de Mongoose que representa la colección "patienthistories" en MongoDB.
// A través de este modelo se crean, leen y actualizan los historiales de pacientes.
const PatientHistory = mongoose.model('PatientHistory', patientHistorySchema);

// Exporta la función de conexión y el modelo para ser usados en servicios y scripts.
module.exports = { connect, PatientHistory };

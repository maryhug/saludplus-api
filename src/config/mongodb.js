const mongoose = require('mongoose');
const { MONGODB_URI, MONGODB_DB } = require('./env');

const connect = async () => {
    // ✅ Usar dbName como opción separada evita el problema del slash doble
    await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB });
    console.log('MongoDB connected');
};


const appointmentEmbedSchema = new mongoose.Schema({
    appointmentId:        { type: String },
    date:                 { type: String },
    doctorName:           { type: String },
    doctorEmail:          { type: String },
    specialty:            { type: String },
    treatmentCode:        { type: String },
    treatmentDescription: { type: String },
    treatmentCost:        { type: Number },
    insuranceProvider:    { type: String },
    coveragePercentage:   { type: Number },
    amountPaid:           { type: Number },
}, { _id: false });

const patientHistorySchema = new mongoose.Schema({
    patientEmail: { type: String, unique: true, required: true, index: true },
    patientName:  { type: String },
    appointments: [appointmentEmbedSchema],
}, { timestamps: true });

const PatientHistory = mongoose.model('PatientHistory', patientHistorySchema);

module.exports = { connect, PatientHistory };

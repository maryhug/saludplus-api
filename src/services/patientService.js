const { PatientHistory } = require('../config/mongodb');

const getPatientHistory = async (email) => {
    const doc = await PatientHistory.findOne({ patientEmail: email.toLowerCase() }).lean();
    if (!doc) return null;

    const appts = doc.appointments || [];
    const totalSpent = appts.reduce((sum, a) => sum + (a.amountPaid || 0), 0);

    // Especialidad más frecuente
    const freq = {};
    for (const a of appts) {
        freq[a.specialty] = (freq[a.specialty] || 0) + 1;
    }
    const mostFrequentSpecialty =
        Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    return {
        patient: { email: doc.patientEmail, name: doc.patientName },
        appointments: appts,
        summary: {
            totalAppointments: appts.length,
            totalSpent,
            mostFrequentSpecialty,
        },
    };
};

module.exports = { getPatientHistory };

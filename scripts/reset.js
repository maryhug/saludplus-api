require('dotenv').config();
const { pool }    = require('../src/config/postgres');
const { connect, PatientHistory } = require('../src/config/mongodb');

const reset = async () => {
    console.log('🔌 Connecting to databases...');
    await connect();
    console.log('');

    // ── PostgreSQL: borrar tablas en orden (respetar FKs) ─────────
    console.log('🗑️  Dropping PostgreSQL tables...');
    const client = await pool.connect();
    try {
        await client.query(`
      DROP TABLE IF EXISTS appointments CASCADE;
      DROP TABLE IF EXISTS treatments   CASCADE;
      DROP TABLE IF EXISTS patients     CASCADE;
      DROP TABLE IF EXISTS doctors      CASCADE;
      DROP TABLE IF EXISTS insurances   CASCADE;
    `);
        console.log('✅ PostgreSQL: all tables dropped');
    } finally {
        client.release();
        await pool.end();
    }

    // ── MongoDB: borrar colección ─────────────────────────────────
    console.log('🗑️  Dropping MongoDB collections...');
    await PatientHistory.collection.drop().catch(err => {
        // Si la colección no existe, no hay error crítico
        if (err.message === 'ns not found') {
            console.log('ℹ️  MongoDB: collection did not exist (skipping)');
        } else {
            throw err;
        }
    });
    console.log('✅ MongoDB: patienthistories collection dropped');

    console.log('');
    console.log('🧹 Reset complete. Both databases are clean.');
    console.log('💡 Run "npm run dev" to recreate schema automatically.');
    process.exit(0);
};

reset().catch(err => {
    console.error('❌ Reset failed:', err.message);
    process.exit(1);
});

require('dotenv').config();
const { migrate }   = require('../src/services/migrationService');
const { initSchema } = require('../src/config/postgres');
const { connect: connectMongo } = require('../src/config/mongodb');

const run = async () => {
    console.log('🔌 Connecting to databases...');
    await connectMongo();
    await initSchema();
    console.log('📦 Starting migration...');
    const result = await migrate({ clearBefore: true });
    console.log('✅ Migration completed:', result);
    process.exit(0);
};

run().catch(err => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
});

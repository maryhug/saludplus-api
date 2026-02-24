require('dotenv').config();
const app           = require('./app');
const { initSchema } = require('./config/postgres');
const { connect: connectMongo } = require('./config/mongodb');
const { PORT }       = require('./config/env');

const start = async () => {
    try {
        await connectMongo();
        await initSchema();
        app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
    } catch (err) {
        console.error('❌ Startup error:', err.message);
        process.exit(1);
    }
};

start();

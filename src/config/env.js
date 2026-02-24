require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 3000,
    DATABASE_URL: process.env.DATABASE_URL,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    MONGODB_DB: process.env.MONGODB_DB || 'saludplus',
    CSV_PATH: process.env.SIMULACRO_CSV_PATH || './data/simulacro_saludplus_data.csv',
};

const dotenv = require('dotenv');
const path = require('path');

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  cookieMaxAgeHours: parseFloat(process.env.COOKIE_MAX_AGE_HOURS) || 1,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5000',
  dbPath: process.env.DB_PATH || './data/database.sqlite',
};

// Validate critical security environment variables
if (!config.jwtSecret) {
  if (config.nodeEnv === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is missing in production mode.');
  } else {
    // In development, warn and provide a fallback if omitted
    console.warn('⚠️ WARNING: JWT_SECRET not found in .env. Using fallback secret for development.');
    config.jwtSecret = 'dev_default_jwt_secret_key_antigravity_2026_super_secure';
  }
}

module.exports = config;

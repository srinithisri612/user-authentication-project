const rateLimit = require('express-rate-limit');
const config = require('../config/env');

// Disable or ease rate limits during automated testing
const isTestEnv = config.nodeEnv === 'test';

/**
 * Brute-force protection for login attempts
 * Limits repeated failed login attempts from a single IP
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: isTestEnv ? 1000 : 10, // 10 login attempts per 15 minutes in production/dev
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
  },
  skip: () => isTestEnv,
});

/**
 * Rate limiter for user registration to prevent automated bot signups
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: isTestEnv ? 1000 : 20, // 20 registrations per hour
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many accounts created from this IP. Please try again after an hour.',
  },
  skip: () => isTestEnv,
});

module.exports = {
  loginLimiter,
  registerLimiter,
};

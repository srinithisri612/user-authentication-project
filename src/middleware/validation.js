/**
 * Validation Middleware for Authentication Endpoints
 */

// RFC 5322 compliant email regex pattern
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Validate password complexity:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 digit
 * - At least 1 special character
 */
const validatePasswordStrength = (password) => {
  const errors = [];
  if (!password || typeof password !== 'string') {
    return ['Password must be provided as a string.'];
  }
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z).');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z).');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number (0-9).');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (e.g. !@#$%^&*).');
  }
  return errors;
};

/**
 * Middleware: Validate Registration Request
 */
const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body || {};
  const errors = [];

  // Validate Name
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Full name is required.');
  } else if (name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long.');
  } else if (name.trim().length > 60) {
    errors.push('Name cannot exceed 60 characters.');
  }

  // Validate Email
  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    errors.push('Email address is required.');
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.push('Please provide a valid email address (e.g. user@example.com).');
  }

  // Validate Password
  const passwordErrors = validatePasswordStrength(password);
  if (passwordErrors.length > 0) {
    errors.push(...passwordErrors);
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors,
    });
  }

  next();
};

/**
 * Middleware: Validate Login Request
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body || {};
  const errors = [];

  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    errors.push('Email address is required.');
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.push('Please provide a valid email format.');
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push('Password is required.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors,
    });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validatePasswordStrength,
};

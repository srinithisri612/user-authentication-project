const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const UserModel = require('../models/userModel');

// Salt rounds for bcrypt hashing (12 rounds provides robust security)
const BCRYPT_SALT_ROUNDS = 12;

/**
 * Helper to generate standardized cookie options
 */
const getCookieOptions = (expires = true) => {
  const isProduction = config.nodeEnv === 'production';
  const options = {
    httpOnly: true, // Prevents client-side script access (mitigates XSS)
    secure: isProduction, // Transmit only over HTTPS in production
    sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
    path: '/',
  };

  if (expires) {
    options.maxAge = config.cookieMaxAgeHours * 60 * 60 * 1000; // Milliseconds
  }

  return options;
};

/**
 * POST /api/auth/register
 * Register a new user
 */
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please log in or use a different email.',
      });
    }

    // Hash the password securely with bcrypt
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Save user to database
    const newUser = await UserModel.create({
      name,
      email,
      hashedPassword,
    });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully. You can now log in.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during registration.',
    });
  }
};

/**
 * POST /api/auth/login
 * Authenticate user and issue JWT stored in HTTP-only cookie
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await UserModel.findByEmail(email);

    // Security practice: Use generic error message to prevent email enumeration
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Compare supplied password with stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Generate signed JWT
    const token = jwt.sign(
      { id: user.id },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    // Set secure HTTP-only cookie
    res.cookie('token', token, getCookieOptions(true));

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.created_at,
      },
      // Note: token is sent via HTTP-only cookie for security, but also returned for API/Postman convenience if required
      token: token,
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during login.',
    });
  }
};

/**
 * GET /api/auth/me
 * Protected route: return currently authenticated user profile
 */
const getMe = async (req, res) => {
  try {
    // req.user was populated by authenticateToken middleware
    return res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error('Get profile error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error fetching user profile.',
    });
  }
};

/**
 * POST /api/auth/logout
 * Invalidate user session by clearing the HTTP-only cookie
 */
const logout = async (req, res) => {
  try {
    // Clear the authentication cookie with identical options
    res.clearCookie('token', getCookieOptions(false));

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    console.error('Logout error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during logout.',
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  getCookieOptions,
};

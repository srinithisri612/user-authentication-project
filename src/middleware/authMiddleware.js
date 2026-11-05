const jwt = require('jsonwebtoken');
const config = require('../config/env');
const UserModel = require('../models/userModel');

/**
 * Reusable JWT Authentication Middleware
 * Validates JWT from HTTP-only cookie (primary) or Authorization Bearer header (secondary)
 */
const authenticateToken = async (req, res, next) => {
  try {
    let token = null;

    // 1. Primary source: HTTP-only cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // 2. Secondary fallback: Authorization header for API tools/Postman
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Reject if no token is found
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.',
      });
    }

    // Verify token signature and expiration
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please log in again.',
          isExpired: true,
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid or malformed token. Authentication failed.',
      });
    }

    // Ensure decoded payload has user ID
    const userId = decoded.id || decoded.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload.',
      });
    }

    // Verify user still exists in the database
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists.',
      });
    }

    // Attach user information to request object (password already excluded by findById)
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.created_at,
    };

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
    });
  }
};

module.exports = authenticateToken;

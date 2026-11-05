const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/authMiddleware');
const { validateRegister, validateLogin } = require('../middleware/validation');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter');

// Public authentication routes
router.post('/register', registerLimiter, validateRegister, authController.register);
router.post('/login', loginLimiter, validateLogin, authController.login);
router.post('/logout', authController.logout);

// Protected routes using authenticateToken middleware
router.get('/me', authenticateToken, authController.getMe);

// Additional protected route demonstrating middleware reusability
router.get('/dashboard-stats', authenticateToken, async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Access granted to protected dashboard resources.',
    accessedBy: req.user.email,
    serverTime: new Date().toISOString(),
  });
});

module.exports = router;

/**
 * Authentication Routes
 * 
 * POST /api/auth/signup - Create new account
 * POST /api/auth/login - Login with email/password
 * POST /api/auth/login-otp - Login with OTP (after failed attempts)
 * GET /api/auth/check-otp-requirement/:email - Check if OTP required
 * GET /api/auth/verify - Verify JWT token
 * POST /api/auth/logout - Logout and clear attempts
 */

const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');
const { authLimiter } = require('../middleware/securityMiddleware');

/**
 * Apply strict rate limiting to all auth endpoints
 * - 5 attempts per hour per IP (prevents brute force)
 */
router.use(authLimiter);

// Public routes
router.post('/signup', authCtrl.signup);
router.post('/login', authCtrl.login);
router.post('/login-otp', authCtrl.loginWithOTP);
router.get('/check-otp-requirement/:email', authCtrl.checkOTPRequirement);
router.get('/verify', authCtrl.verifyToken);
router.post('/logout', authCtrl.logout);

module.exports = router;

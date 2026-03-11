/**
 * OTP routes – /api/otp/*
 *
 *   POST /api/otp/send    → Generate & email a new OTP
 *   POST /api/otp/resend  → Invalidate previous, send new OTP
 *   POST /api/otp/verify  → Verify submitted OTP
 */

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/otpController');
const { otpIpLimiter } = require('../middleware/otpRateLimiter');

// Apply per-IP rate limit to all OTP routes
router.use(otpIpLimiter);

router.post('/send',   ctrl.send);
router.post('/resend',  ctrl.resend);
router.post('/verify',  ctrl.verify);

module.exports = router;

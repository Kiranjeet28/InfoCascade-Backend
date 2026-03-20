/**
 * OTP routes – /api/otp/*
 *
 *   POST /api/otp/send    → Generate & email a new OTP
 *   POST /api/otp/resend  → Invalidate previous, send new OTP
 *   POST /api/otp/verify  → Verify submitted OTP
 *
 * Rate limiting strategy:
 * - Send/Resend: 3 per hour per IP (strict - prevents email flooding)
 * - Verify: 5 per 15 minutes per IP (strict - prevents OTP guessing)
 */

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/otpController');
const { otpSendLimiter, otpVerifyLimiter } = require('../middleware/otpRateLimiter');

// Apply per-IP rate limit for OTP send/resend endpoints (brute force protection)
router.post('/send', otpSendLimiter, ctrl.send);
router.post('/resend', otpSendLimiter, ctrl.resend);

// Apply per-IP rate limit for OTP verify endpoint (OTP guessing prevention)
router.post('/verify', otpVerifyLimiter, ctrl.verify);

// ⚠️  DEBUG endpoint – remove or protect before production!
router.get('/test-email', ctrl.testEmail);

module.exports = router;

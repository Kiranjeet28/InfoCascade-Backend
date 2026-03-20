/**
 * Rate-limiting middleware for OTP endpoints.
 *
 * Multiple layers of protection:
 *  1. Per-IP rate limit for send/resend (brute force protection)
 *  2. Per-email limits enforced inside the controller via otpStore counters
 *  3. Strict verification attempt limiting (prevents OTP guessing)
 *
 * This provides defense-in-depth against brute force attacks.
 */

const rateLimit = require('express-rate-limit');

/**
 * SEND/RESEND OTP rate limiter - Prevents email flooding
 * Strict: 3 requests per hour per IP
 */
const otpSendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  skip: (req) => req.method === 'GET',
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      code: 'OTP_SEND_RATE_LIMIT',
      message: 'Too many OTP requests. Please try again in 1 hour.',
    });
  },
});

/**
 * OTP VERIFY rate limiter - Prevents OTP guessing attacks
 * Very strict: 5 verification attempts per 15 minutes per IP
 */
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 verification attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  skip: (req) => req.method !== 'POST' || !req.path.includes('verify'),
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      code: 'OTP_VERIFY_RATE_LIMIT',
      message: 'Too many verification attempts. Please try again later.',
    });
  },
});

/**
 * General IP-level rate limiter for all /api/otp/* endpoints
 * Moderate protection: 30 requests per hour per IP
 */
const otpIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.API_RATE_LIMIT, 10) || 30, // per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      code: 'OTP_RATE_LIMIT',
      message: 'Too many requests from this IP. Please try again later.',
    });
  },
});

module.exports = { 
  otpIpLimiter,
  otpSendLimiter,
  otpVerifyLimiter
};

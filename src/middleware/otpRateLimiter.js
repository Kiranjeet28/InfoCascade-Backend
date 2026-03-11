/**
 * Rate-limiting middleware for OTP endpoints.
 *
 * Two layers:
 *  1. Per-IP rate limit via express-rate-limit (general flood protection).
 *  2. Per-email limits enforced inside the controller via otpStore counters.
 *
 * This file provides the per-IP middleware.
 */

const rateLimit = require('express-rate-limit');

const windowMs = 60 * 60 * 1000; // 1 hour
const max = parseInt(process.env.API_RATE_LIMIT, 10) || 30; // per IP per hour

/**
 * General IP-level rate limiter for the /api/otp/* family.
 */
const otpIpLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,   // Return `RateLimit-*` headers
  legacyHeaders: false,
  // Use the default key generator (req.ip) which handles IPv6 correctly
  validate: { xForwardedForHeader: false },
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP. Please try again later.',
    });
  },
});

module.exports = { otpIpLimiter };

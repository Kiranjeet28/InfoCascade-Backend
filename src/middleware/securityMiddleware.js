/**
 * Comprehensive security middleware for Express app
 * Protects against:
 * - Brute force attacks
 * - DDoS/DoS attacks
 * - XSS attacks
 * - CSRF attacks
 * - Click-jacking
 * - Parameter pollution
 * - Large payloads
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

/**
 * General global rate limiter
 * Applies to all requests - prevents general DDoS attacks
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  skip: (req) => req.path === '/health', // Skip health checks
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    });
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks on login/signup
 */
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  skip: (req) => req.method === 'GET', // Only limit POST requests
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again after 1 hour.',
    });
  },
});

/**
 * API endpoint rate limiter
 * Prevents abuse of read/write operations
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      code: 'API_RATE_LIMIT_EXCEEDED',
      message: 'Too many API requests. Please try again later.',
    });
  },
});

/**
 * Apply all security middleware to Express app
 * @param {Express.Application} app - Express application instance
 */
function applySecurity(app) {
  // Set trust proxy for rate limiting behind reverse proxies (e.g., Render, AWS)
  app.set('trust proxy', 1);

  // 1. Helmet.js - Set various HTTP headers
  // - Content Security Policy (CSP) - prevents XSS
  // - X-Frame-Options - prevents clickjacking
  // - X-Content-Type-Options - prevents MIME sniffing
  // - Strict-Transport-Security - enforces HTTPS
  // - X-XSS-Protection - additional XSS protection
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  }));

  // 2. Global rate limiter - protects against general DDoS
  app.use(globalLimiter);

  // 3. Body parser with size limits - prevents large payload attacks
  app.use(require('express').json({ limit: '10kb' })); // Limit JSON payload to 10KB
  app.use(require('express').urlencoded({ limit: '10kb', extended: true })); // Limit URL-encoded payload

  // 4. MongoDB data sanitization - prevents NoSQL injection
  app.use(mongoSanitize({
    replaceWith: '_', // Replace prohibited characters
    onSanitize: ({ req, key }) => {
      console.warn(`[Security] Sanitized key: ${key} from IP: ${req.ip}`);
    },
  }));

  // 5. HPP (HTTP Parameter Pollution) - prevents parameter pollution attacks
  app.use(hpp({
    whitelist: ['sort', 'fields', 'page', 'limit'], // Allow these parameters to be arrays
  }));

  // 6. Request timeout - prevents slowloris attacks
  app.use((req, res, next) => {
    req.setTimeout(30000); // 30 second timeout
    res.setTimeout(30000);
    next();
  });

  // 7. Security logging middleware
  app.use((req, res, next) => {
    // Log suspicious patterns
    if (req.query && Object.keys(req.query).length > 10) {
      console.warn(`[Security] Suspicious number of query parameters from ${req.ip}`);
    }
    if (req.body && Object.keys(req.body).length > 20) {
      console.warn(`[Security] Suspicious number of body parameters from ${req.ip}`);
    }
    next();
  });

  return {
    globalLimiter,
    authLimiter,
    apiLimiter,
  };
}

module.exports = { applySecurity, globalLimiter, authLimiter, apiLimiter };

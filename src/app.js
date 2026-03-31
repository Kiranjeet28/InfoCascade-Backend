const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const compression = require('compression');
const routes = require('./routes');
const { applySecurity } = require('./middleware/securityMiddleware');

const app = express();

// ========== SECURITY SETUP ==========
// Apply comprehensive security middleware BEFORE any other middleware/routes
const { globalLimiter, authLimiter, apiLimiter } = applySecurity(app);
// ====================================

// ⚡ COMPRESSION: Reduce response payload size by 60-90%
app.use(compression({ level: 6, threshold: 1024 }));

// Environment-specific logging
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat));

// CORS configuration (after security headers)
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Note: Body parsing is now handled by applySecurity() with size limits
// No need to call express.json() and express.urlencoded() again

// Routes
app.use('/api', routes);

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({ message: 'API is running' });
});

// 404 handler
app.use((req, res) =>
  res.status(404).json({
    success: false,
    code: 'ROUTE_NOT_FOUND',
    message: 'Route not found',
    method: req.method,
    path: req.originalUrl,
  })
);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: Object.values(err.errors || {}).map((e) => ({
        field: e.path,
        message: e.message,
      })),
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      code: 'INVALID_ID_FORMAT',
      message: `Invalid ${err.path} format`,
      field: err.path,
      value: err.value,
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || Object.keys(err.keyValue || {})[0] || 'unique field';
    return res.status(400).json({
      success: false,
      code: 'DUPLICATE_VALUE',
      message: `${field} already exists`,
      field,
      value: err.keyValue?.[field],
    });
  }

  const status = err.status || 500;
  return res.status(status).json({
    success: false,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'Server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

module.exports = app;

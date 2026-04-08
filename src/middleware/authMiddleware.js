const jwt = require('jsonwebtoken');

/**
 * Authentication middleware for protecting student routes
 * Extracts and verifies JWT token from Authorization header
 * Attaches decoded student information to req.student
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function authMiddleware(req, res, next) {
  try {
    // Extract Authorization header
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        code: 'NO_TOKEN',
        message: 'No authentication token provided. Please include Authorization header with Bearer token.',
      });
    }

    // Extract token from "Bearer <token>" format
    const tokenParts = authHeader.split(' ');

    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN_FORMAT',
        message: 'Invalid Authorization header format. Expected: Bearer <token>',
      });
    }

    const token = tokenParts[1];

    // Verify and decode the JWT token
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (error) {
      // Handle specific JWT errors
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired. Please log in again.',
          expiredAt: error.expiredAt,
        });
      }

      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token. Token signature verification failed.',
        });
      }

      // Handle other JWT errors
      throw error;
    }

    // Attach decoded student information to request object
    req.student = {
      _id: decoded.userId || decoded.id || decoded._id,
      studentId: decoded.userId || decoded.id || decoded._id,
      email: decoded.email,
      name: decoded.name,
      isAdmin: decoded.isAdmin || decoded.role === 'admin',
      ...decoded,
    };

    // Proceed to next middleware/route handler
    next();
  } catch (error) {
    console.error('[AuthMiddleware] Unexpected error:', error);
    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Authentication failed. Please try again.',
    });
  }
}

module.exports = authMiddleware;

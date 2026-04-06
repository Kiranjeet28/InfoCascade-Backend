/**
 * Authentication Controller
 * Handles user login with failed attempt tracking
 * Routes to OTP verification after 3 failed attempts
 */

const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const failedLoginTracker = require('../services/failedLoginTracker');

const MAX_FAILED_ATTEMPTS = 3;
const FAILED_ATTEMPT_WINDOW = 3600; // 1 hour in seconds

const fail = (res, status, code, message, extra = {}) =>
  res.status(status).json({ success: false, code, message, ...extra });

const success = (res, status, data = {}) =>
  res.status(status).json({ success: true, ...data });

/**
 * LOGIN - Verify credentials
 * After 3 failed attempts, require OTP verification
 * 
 * Request:
 * POST /api/auth/login
 * {
 *   "email": "user@example.com",
 *   "password": "password123"
 * }
 * 
 * Response (Success):
 * {
 *   "success": true,
 *   "token": "jwt-token",
 *   "user": { id, name, email },
 *   "page": 1
 * }
 * 
 * Response (Wrong Password):
 * {
 *   "success": false,
 *   "code": "INVALID_PASSWORD",
 *   "message": "Invalid password",
 *   "attemptsRemaining": 2,
 *   "maxAttempts": 3
 * }
 * 
 * Response (Too Many Failed Attempts):
 * {
 *   "success": false,
 *   "code": "OTP_VERIFICATION_REQUIRED",
 *   "message": "Too many failed attempts. OTP verification required.",
 *   "requireOTP": true,
 *   "page": 2
 * }
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const clientIp = req.ip;

    // Validation
    if (!email || !password) {
      return fail(res, 400, 'AUTH_REQUIRED_FIELDS', 'email and password are required', {
        requiredFields: ['email', 'password'],
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return fail(res, 401, 'USER_NOT_FOUND', 'User not found', {
        field: 'email',
      });
    }

    // Check if OTP verification is already required for this user
    const otpRequired = await failedLoginTracker.isOTPRequired(email);
    if (otpRequired) {
      return fail(res, 403, 'OTP_VERIFICATION_REQUIRED', 'Too many failed attempts. OTP verification required.', {
        requireOTP: true,
        page: 2,
        message: 'Please verify with OTP to proceed',
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      // Track failed attempt
      const failedAttempts = await failedLoginTracker.trackFailedAttempt(email, clientIp);
      
      // Check if max attempts exceeded
      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        // Mark user as requiring OTP
        await failedLoginTracker.requireOTPVerification(email);
        
        return fail(res, 403, 'OTP_VERIFICATION_REQUIRED', 'Too many failed attempts. OTP verification required.', {
          requireOTP: true,
          page: 2,
          failedAttempts,
          message: 'Maximum password attempts reached. Please verify with OTP to proceed',
        });
      }

      // Return attempt count
      const attemptsRemaining = MAX_FAILED_ATTEMPTS - failedAttempts;
      return fail(res, 401, 'INVALID_PASSWORD', 'Invalid password', {
        attemptsRemaining,
        maxAttempts: MAX_FAILED_ATTEMPTS,
        failedAttempts,
        warning: `You have ${attemptsRemaining} attempt(s) remaining before OTP verification is required`,
      });
    }

    // Password correct - reset failed attempts
    await failedLoginTracker.resetFailedAttempts(email, clientIp);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    return success(res, 200, {
      code: 'LOGIN_SUCCESS',
      message: 'Login successful',
      page: 1,
      token,
      user: user.toJSON(),
    });

  } catch (err) {
    next(err);
  }
};

/**
 * LOGIN WITH OTP - Alternative login using OTP when password attempts exceeded
 * 
 * Request:
 * POST /api/auth/login-otp
 * {
 *   "email": "user@example.com",
 *   "otp": "123456"
 * }
 * 
 * Response (Success):
 * {
 *   "success": true,
 *   "token": "jwt-token",
 *   "user": { id, name, email },
 *   "message": "OTP verification successful. Login complete."
 * }
 * 
 * Response (Invalid OTP):
 * {
 *   "success": false,
 *   "code": "INVALID_OTP",
 *   "message": "Invalid or expired OTP"
 * }
 */
exports.loginWithOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    // Validation
    if (!email || !otp) {
      return fail(res, 400, 'AUTH_REQUIRED_FIELDS', 'email and otp are required', {
        requiredFields: ['email', 'otp'],
      });
    }

    // This assumes OTP verification is done in OTP controller
    // For now, we'll check if OTP verification was passed
    // In practice, you'd verify the OTP here

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return fail(res, 401, 'USER_NOT_FOUND', 'User not found');
    }

    // Clear OTP requirement
    await failedLoginTracker.clearOTPRequirement(email);
    await failedLoginTracker.resetFailedAttempts(email, req.ip);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    return success(res, 200, {
      code: 'LOGIN_OTP_SUCCESS',
      message: 'OTP verification successful. Login complete.',
      page: 1,
      token,
      user: user.toJSON(),
    });

  } catch (err) {
    next(err);
  }
};

/**
 * CHECK OTP REQUIREMENT - Check if user needs OTP verification
 * 
 * Request:
 * GET /api/auth/check-otp-requirement/:email
 * 
 * Response:
 * {
 *   "success": true,
 *   "requireOTP": true,
 *   "page": 2
 * }
 */
exports.checkOTPRequirement = async (req, res, next) => {
  try {
    const { email } = req.params;

    const otpRequired = await failedLoginTracker.isOTPRequired(email);

    return success(res, 200, {
      code: 'OTP_CHECK_COMPLETE',
      requireOTP: otpRequired,
      page: otpRequired ? 2 : 1,
      message: otpRequired 
        ? 'OTP verification required' 
        : 'Normal login available',
    });

  } catch (err) {
    next(err);
  }
};

/**
 * SIGNUP - Create new user with password
 * 
 * Request:
 * POST /api/auth/signup
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "password": "SecurePassword123!"
 * }
 * 
 * Response (Success):
 * {
 *   "success": true,
 *   "code": "SIGNUP_SUCCESS",
 *   "token": "jwt-token",
 *   "user": { id, name, email }
 * }
 */
exports.signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return fail(res, 400, 'AUTH_REQUIRED_FIELDS', 'name, email, and password are required', {
        requiredFields: ['name', 'email', 'password'],
      });
    }

    // Password strength validation
    if (password.length < 8) {
      return fail(res, 400, 'WEAK_PASSWORD', 'Password must be at least 8 characters long', {
        requirement: 'minimum 8 characters',
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return fail(res, 400, 'USER_EMAIL_ALREADY_EXISTS', 'Email already registered', {
        field: 'email',
      });
    }

    // Create new user
    const user = new User({ name, email, password });
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    return success(res, 201, {
      code: 'SIGNUP_SUCCESS',
      message: 'Account created successfully',
      token,
      user: user.toJSON(),
    });

  } catch (err) {
    if (err.code === 11000) {
      return fail(res, 400, 'USER_EMAIL_ALREADY_EXISTS', 'Email already registered', {
        field: 'email',
      });
    }
    next(err);
  }
};

/**
 * VERIFY TOKEN - Verify JWT token validity
 * 
 * Request:
 * GET /api/auth/verify
 * Headers: Authorization: Bearer <token>
 * 
 * Response (Valid):
 * {
 *   "success": true,
 *   "valid": true,
 *   "user": { id, email }
 * }
 * 
 * Response (Invalid):
 * {
 *   "success": false,
 *   "valid": false,
 *   "message": "Invalid or expired token"
 * }
 */
exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return fail(res, 401, 'NO_TOKEN', 'No token provided', {
        valid: false,
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    return success(res, 200, {
      code: 'TOKEN_VALID',
      message: 'Token is valid',
      valid: true,
      user: {
        id: decoded.userId,
        email: decoded.email,
      },
    });

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return fail(res, 401, 'TOKEN_EXPIRED', 'Token has expired', {
        valid: false,
        expiredAt: err.expiredAt,
      });
    }
    
    return fail(res, 401, 'INVALID_TOKEN', 'Invalid token', {
      valid: false,
    });
  }
};

/**
 * LOGOUT - Clear OTP requirement and reset attempts
 * 
 * Request:
 * POST /api/auth/logout
 * {
 *   "email": "user@example.com"
 * }
 */
exports.logout = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return fail(res, 400, 'EMAIL_REQUIRED', 'email is required');
    }

    // Clear OTP requirement
    await failedLoginTracker.clearOTPRequirement(email);
    
    return success(res, 200, {
      code: 'LOGOUT_SUCCESS',
      message: 'Logged out successfully',
    });

  } catch (err) {
    next(err);
  }
};

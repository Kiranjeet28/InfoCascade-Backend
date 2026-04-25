/**
 * Token Service
 * Manages JWT access and refresh tokens with security best practices
 *
 * Features:
 * - Separate access (15m) and refresh (30d) tokens
 * - Token rotation to detect token reuse attacks
 * - Secure refresh token storage (requires Redis or DB)
 * - Token revocation support
 */

const jwt = require('jsonwebtoken');
const Redis = require('ioredis');

// Initialize Redis for token storage (optional but recommended for production)
let redisClient = null;
try {
  redisClient = new Redis(process.env.REDIS_URL || {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  });
} catch (err) {
  console.warn('[TokenService] Redis not available. Using in-memory storage (not recommended for production)');
}

// In-memory fallback storage (dev only)
const tokenBlacklist = new Map();
const refreshTokens = new Map();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret-key';

const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '30d'; // 30 days

/**
 * Generate access token (short-lived)
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @returns {string} Access token
 */
function generateAccessToken(userId, email) {
  return jwt.sign(
    { userId, email, type: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Generate refresh token (long-lived)
 * Includes a tokenFamily for rotation detection
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @param {string} tokenFamily - Unique identifier for this token family
 * @returns {string} Refresh token
 */
function generateRefreshToken(userId, email, tokenFamily) {
  return jwt.sign(
    { userId, email, type: 'refresh', tokenFamily },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * Store refresh token in Redis/storage for later validation
 * @param {string} userId - User ID
 * @param {string} token - Refresh token
 * @param {string} tokenFamily - Token family ID
 * @returns {Promise<void>}
 */
async function storeRefreshToken(userId, token, tokenFamily) {
  const key = `refresh_token:${userId}:${tokenFamily}`;
  const expirySeconds = 30 * 24 * 60 * 60; // 30 days

  if (redisClient && redisClient.status === 'ready') {
    await redisClient.setex(key, expirySeconds, token);
  } else {
    // Fallback to in-memory storage
    refreshTokens.set(key, {
      token,
      expiresAt: Date.now() + expirySeconds * 1000,
    });
  }
}

/**
 * Verify refresh token and check if it's stored
 * @param {string} userId - User ID
 * @param {string} token - Refresh token to verify
 * @returns {Promise<Object>} Decoded token data
 * @throws {Error} If token is invalid or not found
 */
async function verifyRefreshToken(userId, token) {
  try {
    // Verify JWT signature and expiry
    const decoded = jwt.verify(token, REFRESH_SECRET);

    // Validate token type
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Validate user ID matches
    if (decoded.userId !== userId) {
      throw new Error('Token does not match user');
    }

    // Check if token is stored (prevents use of old tokens after rotation)
    const key = `refresh_token:${userId}:${decoded.tokenFamily}`;

    if (redisClient && redisClient.status === 'ready') {
      const storedToken = await redisClient.get(key);
      if (!storedToken || storedToken !== token) {
        throw new Error('Refresh token not found or does not match');
      }
    } else {
      // Fallback to in-memory storage
      const stored = refreshTokens.get(key);
      if (!stored || stored.token !== token) {
        throw new Error('Refresh token not found or does not match');
      }

      // Check expiry in-memory storage
      if (stored.expiresAt < Date.now()) {
        refreshTokens.delete(key);
        throw new Error('Refresh token has expired');
      }
    }

    return decoded;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new Error('Refresh token has expired');
    }
    if (err.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    }
    throw err;
  }
}

/**
 * Verify access token
 * @param {string} token - Access token to verify
 * @returns {Object} Decoded token data
 * @throws {Error} If token is invalid
 */
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new Error('Access token has expired');
    }
    if (err.name === 'JsonWebTokenError') {
      throw new Error('Invalid access token');
    }
    throw err;
  }
}

/**
 * Issue both access and refresh tokens
 * Generates new token family for refresh token tracking
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @returns {Promise<Object>} { accessToken, refreshToken, expiresIn }
 */
async function issueTokens(userId, email) {
  const tokenFamily = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const accessToken = generateAccessToken(userId, email);
  const refreshToken = generateRefreshToken(userId, email, tokenFamily);

  // Store refresh token for validation
  await storeRefreshToken(userId, refreshToken, tokenFamily);

  return {
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
  };
}

/**
 * Refresh access token using refresh token
 * Implements token rotation: old refresh token is revoked, new one is issued
 * @param {string} userId - User ID
 * @param {string} refreshToken - Current refresh token
 * @returns {Promise<Object>} { accessToken, refreshToken, expiresIn }
 * @throws {Error} If refresh token is invalid
 */
async function refreshAccessToken(userId, refreshToken) {
  // Verify refresh token
  const decoded = await verifyRefreshToken(userId, refreshToken);

  // Generate new tokens
  const newAccessToken = generateAccessToken(userId, decoded.email);

  // Rotate refresh token (new family for security)
  const newTokenFamily = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const newRefreshToken = generateRefreshToken(userId, decoded.email, newTokenFamily);

  // Revoke old refresh token
  const oldKey = `refresh_token:${userId}:${decoded.tokenFamily}`;
  if (redisClient && redisClient.status === 'ready') {
    await redisClient.del(oldKey);
  } else {
    refreshTokens.delete(oldKey);
  }

  // Store new refresh token
  await storeRefreshToken(userId, newRefreshToken, newTokenFamily);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: 900,
  };
}

/**
 * Revoke refresh token (logout functionality)
 * @param {string} userId - User ID
 * @param {string} refreshToken - Refresh token to revoke
 * @returns {Promise<void>}
 */
async function revokeRefreshToken(userId, refreshToken) {
  try {
    const decoded = jwt.decode(refreshToken);
    if (!decoded) return;

    const key = `refresh_token:${userId}:${decoded.tokenFamily}`;

    if (redisClient && redisClient.status === 'ready') {
      await redisClient.del(key);
    } else {
      refreshTokens.delete(key);
    }
  } catch (err) {
    console.error('[TokenService] Error revoking token:', err.message);
  }
}

/**
 * Revoke all refresh tokens for a user (force logout all sessions)
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function revokeAllRefreshTokens(userId) {
  try {
    if (redisClient && redisClient.status === 'ready') {
      // Pattern match and delete all tokens for this user
      const pattern = `refresh_token:${userId}:*`;
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } else {
      // Fallback to in-memory storage
      for (const key of refreshTokens.keys()) {
        if (key.startsWith(`refresh_token:${userId}:`)) {
          refreshTokens.delete(key);
        }
      }
    }
  } catch (err) {
    console.error('[TokenService] Error revoking all tokens:', err.message);
  }
}

/**
 * Add token to blacklist (for immediate revocation if needed)
 * @param {string} token - Token to blacklist
 * @returns {Promise<void>}
 */
async function blacklistToken(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return;

    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl <= 0) return;

    if (redisClient && redisClient.status === 'ready') {
      await redisClient.setex(`blacklist:${token}`, ttl, '1');
    } else {
      tokenBlacklist.set(token, Date.now() + ttl * 1000);
    }
  } catch (err) {
    console.error('[TokenService] Error blacklisting token:', err.message);
  }
}

/**
 * Check if token is blacklisted
 * @param {string} token - Token to check
 * @returns {Promise<boolean>} True if blacklisted
 */
async function isTokenBlacklisted(token) {
  try {
    if (redisClient && redisClient.status === 'ready') {
      const result = await redisClient.exists(`blacklist:${token}`);
      return result === 1;
    } else {
      const stored = tokenBlacklist.get(token);
      if (!stored) return false;
      if (stored < Date.now()) {
        tokenBlacklist.delete(token);
        return false;
      }
      return true;
    }
  } catch (err) {
    console.error('[TokenService] Error checking blacklist:', err.message);
    return false;
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  issueTokens,
  refreshAccessToken,
  storeRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  blacklistToken,
  isTokenBlacklisted,
};

/**
 * Failed login attempt tracker
 * Uses in-memory storage or Redis to track failed password attempts
 * After 3 failed attempts, user must use OTP verification instead
 */

const redis = require('ioredis');

// Initialize Redis client (optional, falls back to in-memory)
let redisClient;
try {
  redisClient = new redis(process.env.REDIS_URL || 'redis://localhost:6379');
} catch (err) {
  console.warn('[FailedLogin] Redis not available, using in-memory storage');
  redisClient = null;
}

// In-memory fallback store
const inMemoryStore = {};

/**
 * Track a failed login attempt
 * @param {string} email - User email
 * @param {string} ip - Client IP address
 * @returns {Promise<number>} Number of failed attempts
 */
async function trackFailedAttempt(email, ip) {
  const key = `failed_login:${email}:${ip}`;
  const failCount = redisClient 
    ? parseInt(await redisClient.incr(key)) 
    : ++inMemoryStore[key] || 1;

  // Set expiry to 1 hour
  if (redisClient) {
    await redisClient.expire(key, 3600);
  }

  // Clean up old in-memory entries periodically
  if (!redisClient && Math.random() < 0.01) {
    Object.keys(inMemoryStore).forEach(k => {
      if (inMemoryStore[k].timestamp && Date.now() - inMemoryStore[k].timestamp > 3600000) {
        delete inMemoryStore[k];
      }
    });
  }

  return failCount;
}

/**
 * Get current failed attempt count
 * @param {string} email - User email
 * @param {string} ip - Client IP address
 * @returns {Promise<number>} Number of failed attempts
 */
async function getFailedAttempts(email, ip) {
  const key = `failed_login:${email}:${ip}`;
  
  if (redisClient) {
    const count = await redisClient.get(key);
    return count ? parseInt(count) : 0;
  }
  
  return inMemoryStore[key] || 0;
}

/**
 * Reset failed attempts for a user
 * @param {string} email - User email
 * @param {string} ip - Client IP address
 * @returns {Promise<void>}
 */
async function resetFailedAttempts(email, ip) {
  const key = `failed_login:${email}:${ip}`;
  
  if (redisClient) {
    await redisClient.del(key);
  } else {
    delete inMemoryStore[key];
  }
}

/**
 * Mark user as requiring OTP verification
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
async function requireOTPVerification(email) {
  const key = `require_otp:${email}`;
  
  if (redisClient) {
    await redisClient.setex(key, 3600, 'true'); // Expires in 1 hour
  } else {
    inMemoryStore[key] = { value: true, timestamp: Date.now() };
  }
}

/**
 * Check if user needs OTP verification
 * @param {string} email - User email
 * @returns {Promise<boolean>}
 */
async function isOTPRequired(email) {
  const key = `require_otp:${email}`;
  
  if (redisClient) {
    const result = await redisClient.get(key);
    return result === 'true';
  }
  
  if (inMemoryStore[key]) {
    if (Date.now() - inMemoryStore[key].timestamp > 3600000) {
      delete inMemoryStore[key];
      return false;
    }
    return true;
  }
  
  return false;
}

/**
 * Clear OTP requirement
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
async function clearOTPRequirement(email) {
  const key = `require_otp:${email}`;
  
  if (redisClient) {
    await redisClient.del(key);
  } else {
    delete inMemoryStore[key];
  }
}

module.exports = {
  trackFailedAttempt,
  getFailedAttempts,
  resetFailedAttempts,
  requireOTPVerification,
  isOTPRequired,
  clearOTPRequirement,
};

/**
 * OTP utility functions – generation, hashing, and comparison.
 *
 * - Uses crypto.randomInt for cryptographically strong 6-digit codes.
 * - Hashes with HMAC-SHA256 using a server-side secret before storage.
 */

const crypto = require('crypto');

const OTP_SECRET = process.env.OTP_SECRET || 'change-me-in-production-otp-secret';
const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = 5 * 60; // 5 minutes

/**
 * Generate a cryptographically secure 6-digit numeric OTP.
 * @returns {string} e.g. "038291"
 */
function generateOtp() {
  const min = Math.pow(10, OTP_LENGTH - 1);   // 100000
  const max = Math.pow(10, OTP_LENGTH);        // 1000000
  const num = crypto.randomInt(min, max);
  return num.toString();
}

/**
 * Produce an HMAC-SHA256 digest of the OTP using the server secret.
 * Only this hash is ever stored – the raw OTP is never persisted.
 * @param {string} otp - The plaintext OTP
 * @returns {string} hex digest
 */
function hashOtp(otp) {
  return crypto
    .createHmac('sha256', OTP_SECRET)
    .update(otp)
    .digest('hex');
}

/**
 * Constant-time comparison of a candidate OTP against a stored hash.
 * @param {string} candidateOtp - User-submitted OTP
 * @param {string} storedHash   - Hash retrieved from the store
 * @returns {boolean}
 */
function verifyOtp(candidateOtp, storedHash) {
  const candidateHash = hashOtp(candidateOtp);
  // timingSafeEqual requires same-length buffers
  const a = Buffer.from(candidateHash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Validate that an email address belongs to @gmail.com.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@gmail\.com$/i;
  return re.test(email.trim());
}

module.exports = {
  generateOtp,
  hashOtp,
  verifyOtp,
  isValidEmail,
  OTP_TTL_SECONDS,
  OTP_LENGTH,
};

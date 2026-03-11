/**
 * OTP Controller – handles send, resend, and verify logic.
 *
 * Security notes:
 *  - OTPs are generated server-side with crypto.randomInt.
 *  - Only HMAC-SHA256 hashes are stored (never plaintext).
 *  - Per-email rate limits (send, resend) and attempt throttling (verify).
 *  - Consistent error messages to avoid disclosing user existence.
 */

const { generateOtp, hashOtp, verifyOtp, isValidEmail } = require('../utils/otp');
const otpStore = require('../services/otpStore');
const { sendOtpEmail } = require('../services/emailService');

/* ------------------------------------------------------------------ */
/*  POST /api/otp/send                                                */
/* ------------------------------------------------------------------ */
exports.send = async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email. Must be a valid @gndec.ac.in address.',
      });
    }

    // Per-email send rate limit
    const sendCount = await otpStore.getSendCount(email);
    if (sendCount >= otpStore.SEND_LIMIT) {
      console.warn(`[OTP] Send limit reached for ${email}`);
      return res.status(429).json({
        success: false,
        message: 'OTP send limit reached. Please try again later.',
      });
    }

    // Generate → hash → store → email
    const otp = generateOtp();
    const hashed = hashOtp(otp);
    await otpStore.saveOtp(email, hashed);
    await otpStore.incrementSendCount(email);

    await sendOtpEmail(email, otp);

    console.log(`[OTP] OTP sent to ${email} (send #${sendCount + 1})`);

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your email.',
    });
  } catch (err) {
    console.error('[OTP] send error:', err.message);
    next(err);
  }
};

/* ------------------------------------------------------------------ */
/*  POST /api/otp/resend                                              */
/* ------------------------------------------------------------------ */
exports.resend = async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email. Must be a valid @gndec.ac.in address.',
      });
    }

    // Per-email resend rate limit
    const resendCount = await otpStore.getResendCount(email);
    if (resendCount >= otpStore.RESEND_LIMIT) {
      console.warn(`[OTP] Resend limit reached for ${email}`);
      return res.status(429).json({
        success: false,
        message: 'Resend limit reached. Please try again later.',
      });
    }

    // Invalidate previous OTP, generate new one
    await otpStore.deleteOtp(email);

    const otp = generateOtp();
    const hashed = hashOtp(otp);
    await otpStore.saveOtp(email, hashed);
    await otpStore.incrementResendCount(email);

    await sendOtpEmail(email, otp);

    console.log(`[OTP] OTP re-sent to ${email} (resend #${resendCount + 1})`);

    return res.status(200).json({
      success: true,
      message: 'A new OTP has been sent to your email.',
    });
  } catch (err) {
    console.error('[OTP] resend error:', err.message);
    next(err);
  }
};

/* ------------------------------------------------------------------ */
/*  POST /api/otp/verify                                              */
/* ------------------------------------------------------------------ */
exports.verify = async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const otp   = (req.body.otp   || '').trim();

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email. Must be a valid @gndec.ac.in address.',
      });
    }

    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'OTP must be a 6-digit number.',
      });
    }

    // Check attempt throttle
    const attempts = await otpStore.getAttempts(email);
    if (attempts >= otpStore.MAX_VERIFY_ATTEMPTS) {
      console.warn(`[OTP] Verify locked for ${email} (${attempts} attempts)`);
      return res.status(429).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.',
      });
    }

    const storedHash = await otpStore.getOtp(email);
    if (!storedHash) {
      // Could be expired or never sent – same message to avoid info leak
      return res.status(400).json({
        success: false,
        message: 'OTP is invalid or has expired.',
      });
    }

    if (!verifyOtp(otp, storedHash)) {
      await otpStore.incrementAttempts(email);
      const newCount = attempts + 1;
      console.log(`[OTP] Failed verify for ${email} (attempt ${newCount}/${otpStore.MAX_VERIFY_ATTEMPTS})`);
      return res.status(400).json({
        success: false,
        message: 'OTP is invalid or has expired.',
      });
    }

    // Success – clean up
    await otpStore.deleteOtp(email);
    await otpStore.resetAttempts(email);

    console.log(`[OTP] Email verified: ${email}`);

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully.',
    });
  } catch (err) {
    console.error('[OTP] verify error:', err.message);
    next(err);
  }
};

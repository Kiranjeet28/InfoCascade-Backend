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
const { sendOtpEmail, testEmailSending } = require('../services/emailService');

/**
 * Extract email from request body.
 * Accepts both { email: "..." } (new) and { to: "..." } (legacy frontend).
 */
function extractEmail(body) {
  return (body.email || body.to || '').trim().toLowerCase();
}

/* ------------------------------------------------------------------ */
/*  POST /api/otp/send                                                */
/* ------------------------------------------------------------------ */
exports.send = async (req, res, next) => {
  try {
    const email = extractEmail(req.body);

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

    try {
      await sendOtpEmail(email, otp);
    } catch (emailErr) {
      console.error(`[OTP] Email send failed for ${email}:`, emailErr.message);
      console.error('[OTP] Full email error:', emailErr);
      console.error('[OTP] Error stack:', emailErr.stack);
      // Clean up stored OTP since email didn't go out
      await otpStore.deleteOtp(email).catch(() => {});
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again later.',
        debug_error: process.env.NODE_ENV !== 'production' ? emailErr.message : undefined,
      });
    }

    console.log(`[OTP] OTP sent to ${email} (send #${sendCount + 1})`);

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your email.',
    });
  } catch (err) {
    console.error('[OTP] send error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
    });
  }
};

/* ------------------------------------------------------------------ */
/*  POST /api/otp/resend                                              */
/* ------------------------------------------------------------------ */
exports.resend = async (req, res, next) => {
  try {
    const email = extractEmail(req.body);

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

    try {
      await sendOtpEmail(email, otp);
    } catch (emailErr) {
      console.error(`[OTP] Resend email failed for ${email}:`, emailErr.message);
      console.error('[OTP] Full resend email error:', emailErr);
      console.error('[OTP] Resend error stack:', emailErr.stack);
      await otpStore.deleteOtp(email).catch(() => {});
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again later.',
        debug_error: process.env.NODE_ENV !== 'production' ? emailErr.message : undefined,
      });
    }

    console.log(`[OTP] OTP re-sent to ${email} (resend #${resendCount + 1})`);

    return res.status(200).json({
      success: true,
      message: 'A new OTP has been sent to your email.',
    });
  } catch (err) {
    console.error('[OTP] resend error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
    });
  }
};

/* ------------------------------------------------------------------ */
/*  POST /api/otp/verify                                              */
/* ------------------------------------------------------------------ */
exports.verify = async (req, res, next) => {
  try {
    const email = extractEmail(req.body);
    const otp   = (req.body.otp || '').trim();

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
    return res.status(500).json({
      success: false,
      message: 'Verification failed. Please try again.',
    });
  }
};

/* ------------------------------------------------------------------ */
/*  GET /api/otp/test-email?to=email@example.com                     */
/*  DEBUG endpoint – tests all email providers and returns results.   */
/*  ⚠️  Remove or protect this endpoint before going to production!  */
/* ------------------------------------------------------------------ */
exports.testEmail = async (req, res) => {
  try {
    const to = (req.query.to || req.query.email || '').trim().toLowerCase();
    if (!to || !to.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Provide ?to=email@example.com query parameter.',
      });
    }

    console.log(`[OTP] Test email requested for: ${to}`);
    const results = await testEmailSending(to);

    return res.status(200).json({
      success: true,
      message: 'Email test completed — check results below.',
      results,
    });
  } catch (err) {
    console.error('[OTP] test-email error:', err);
    return res.status(500).json({
      success: false,
      message: 'Test email failed.',
      error: err.message,
      stack: err.stack,
    });
  }
};

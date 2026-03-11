/**
 * Email Service – sends OTP emails.
 *
 * Strategy (auto-detected from env vars):
 *   1. RESEND_API_KEY set  → use Resend HTTP API (works on Render, recommended)
 *   2. Otherwise           → use Nodemailer SMTP (works locally, blocked on Render free tier)
 *
 * Both paths include timeouts so the endpoint NEVER hangs.
 */

const nodemailer = require('nodemailer');

const EMAIL_SEND_TIMEOUT = parseInt(process.env.EMAIL_SEND_TIMEOUT, 10) || 20000; // 20s

/* ---------- Resend (HTTP-based, works on Render) ---------- */

let resendClient = null;

if (process.env.RESEND_API_KEY) {
  const { Resend } = require('resend');
  resendClient = new Resend(process.env.RESEND_API_KEY);
  console.log('[Email] Using Resend HTTP API');
} else {
  console.log('[Email] Using Nodemailer SMTP (set RESEND_API_KEY for production)');
}

/* ---------- Nodemailer SMTP (local dev / fallback) ---------- */

const transportConfig = {
  host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10),
  secure: false, // STARTTLS
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
  },
  // CRITICAL: Timeouts so SMTP never hangs on Render
  connectionTimeout: 10000,  // 10s to establish TCP connection
  greetingTimeout: 10000,    // 10s for SMTP greeting
  socketTimeout: 15000,      // 15s for socket inactivity
};

const transporter = nodemailer.createTransport(transportConfig);

/**
 * Builds a styled HTML email body matching the existing frontend template.
 */
function buildOtpHtml(otp) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.08);overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:.5px;">
              &#128274; InfoCascade
            </h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,.85);font-size:14px;">Email Verification</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 16px;color:#333;font-size:16px;line-height:1.6;">
              Hello! Use the OTP below to verify your email address. This code is valid for <strong>5 minutes</strong>.
            </p>
            <div style="text-align:center;margin:28px 0;">
              <span style="display:inline-block;background:#f0f0ff;border:2px dashed #667eea;border-radius:10px;padding:16px 36px;font-size:36px;font-weight:700;letter-spacing:10px;color:#4a4a8a;">
                ${otp}
              </span>
            </div>
            <p style="margin:16px 0 0;color:#888;font-size:13px;line-height:1.5;text-align:center;">
              If you did not request this code, please ignore this email.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#fafafa;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
            <p style="margin:0;color:#aaa;font-size:12px;">&copy; ${new Date().getFullYear()} InfoCascade &mdash; GNDEC</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Send an OTP email – auto-selects Resend or Nodemailer.
 * Always wrapped in a timeout so the request NEVER hangs.
 *
 * @param {string} to   - recipient email address
 * @param {string} otp  - the 6-digit OTP (plaintext, for the email body)
 */
async function sendOtpEmail(to, otp) {
  const from = process.env.EMAIL_FROM || `"InfoCascade" <${transportConfig.auth.user}>`;
  const subject = 'Your InfoCascade Verification Code';
  const html = buildOtpHtml(otp);
  const text = `Your InfoCascade verification code is: ${otp}\n\nThis code expires in 5 minutes. If you did not request this, please ignore this email.`;

  // Wrap in a timeout so it NEVER hangs
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Email send timed out after ' + EMAIL_SEND_TIMEOUT + 'ms')), EMAIL_SEND_TIMEOUT)
  );

  let emailPromise;

  if (resendClient) {
    // ── Resend (HTTP API) ──
    emailPromise = resendClient.emails.send({
      from: process.env.RESEND_FROM || 'InfoCascade <onboarding@resend.dev>',
      to,
      subject,
      html,
      text,
    }).then(({ data, error }) => {
      if (error) throw new Error(error.message);
      console.log(`[Email] OTP sent via Resend to ${to} (id: ${data.id})`);
      return data;
    });
  } else {
    // ── Nodemailer SMTP ──
    emailPromise = transporter.sendMail({ from, to, subject, html, text })
      .then((info) => {
        console.log(`[Email] OTP sent via SMTP to ${to} (messageId: ${info.messageId})`);
        return info;
      });
  }

  return Promise.race([emailPromise, timeoutPromise]);
}

module.exports = { sendOtpEmail, buildOtpHtml };

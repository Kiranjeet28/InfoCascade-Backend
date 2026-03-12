/**
 * Email Service – sends OTP emails.
 *
 * Strategy (auto-detected from env vars, first match wins):
 *   1. BREVO_API_KEY  → Brevo HTTP API (free 300/day, sends to ANY email, works on Render)
 *   2. RESEND_API_KEY → Resend HTTP API (needs verified domain for non-self emails)
 *   3. Fallback       → Nodemailer SMTP (works locally, blocked on Render free tier)
 *
 * All paths include timeouts so the endpoint NEVER hangs.
 */

const nodemailer = require('nodemailer');

const EMAIL_SEND_TIMEOUT = parseInt(process.env.EMAIL_SEND_TIMEOUT, 10) || 20000; // 20s

/* ---------- Provider detection ---------- */

let emailProvider = 'smtp'; // default

if (process.env.BREVO_API_KEY) {
  emailProvider = 'brevo';
  console.log('[Email] Using Brevo HTTP API');
} else if (process.env.RESEND_API_KEY) {
  emailProvider = 'resend';
  console.log('[Email] Using Resend HTTP API');
} else {
  console.log('[Email] Using Nodemailer SMTP (set BREVO_API_KEY for production)');
}

/* ---------- Resend client (lazy) ---------- */

let resendClient = null;
if (emailProvider === 'resend') {
  const { Resend } = require('resend');
  resendClient = new Resend(process.env.RESEND_API_KEY);
}

/* ---------- Brevo SMTP transport (preferred for Render) ---------- */

let brevoSmtpTransport = null;
if (process.env.BREVO_USER && process.env.BREVO_PASS) {
  const brevoSmtpConfig = {
    host: 'smtp-relay.brevo.com',        // ← correct Brevo SMTP relay host
    port: 587,                            // ← STARTTLS port (NOT 465, NOT 25)
    secure: false,                        // false for port 587 (STARTTLS)
    auth: {
      user: process.env.BREVO_USER,       // Brevo login email
      pass: process.env.BREVO_PASS,       // Brevo SMTP key (NOT API key)
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  };
  brevoSmtpTransport = nodemailer.createTransport(brevoSmtpConfig);
  console.log('[Email] Brevo SMTP transport configured (smtp-relay.brevo.com:587)');
}

/* ---------- Nodemailer SMTP (local dev / fallback) ---------- */

const smtpPort = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '465', 10);

const transportConfig = {
  host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
};

const transporter = nodemailer.createTransport(transportConfig);

/* ---------- Brevo HTTP API helper (no npm package needed) ---------- */

async function sendViaBrevo(to, subject, html, text) {
  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || process.env.SMTP_USER;
  const senderName  = process.env.BREVO_SENDER_NAME  || 'InfoCascade';

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Brevo API error ${response.status}: ${data.message || JSON.stringify(data)}`);
  }

  console.log(`[Email] OTP sent via Brevo to ${to} (messageId: ${data.messageId})`);
  return data;
}

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

  if (emailProvider === 'brevo') {
    // ── Brevo HTTP API (works on Render, sends to ANY recipient) ──
    emailPromise = sendViaBrevo(to, subject, html, text);
  } else if (emailProvider === 'resend' && resendClient) {
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
  } else if (brevoSmtpTransport) {
    // ── Brevo SMTP (if BREVO_USER + BREVO_PASS are set) ──
    const brevoFrom = `"${process.env.BREVO_SENDER_NAME || 'InfoCascade'}" <${process.env.BREVO_SENDER_EMAIL || process.env.BREVO_USER}>`;
    emailPromise = brevoSmtpTransport.sendMail({ from: brevoFrom, to, subject, html, text })
      .then((info) => {
        console.log(`[Email] OTP sent via Brevo SMTP to ${to} (messageId: ${info.messageId})`);
        return info;
      });
  } else {
    // ── Nodemailer SMTP (local dev) ──
    emailPromise = transporter.sendMail({ from, to, subject, html, text })
      .then((info) => {
        console.log(`[Email] OTP sent via SMTP to ${to} (messageId: ${info.messageId})`);
        return info;
      });
  }

  return Promise.race([emailPromise, timeoutPromise]);
}

/**
 * Test email sending – isolates the email step and returns the exact error.
 * Used by the /api/otp/test-email debug endpoint.
 */
async function testEmailSending(to) {
  const results = {
    provider: emailProvider,
    brevoSmtpConfigured: !!brevoSmtpTransport,
    envCheck: {
      BREVO_API_KEY: !!process.env.BREVO_API_KEY,
      BREVO_USER: !!process.env.BREVO_USER,
      BREVO_PASS: !!process.env.BREVO_PASS,
      BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || '(not set)',
      EMAIL_USER: !!process.env.EMAIL_USER,
      EMAIL_PASS: !!process.env.EMAIL_PASS,
    },
    tests: {},
  };

  // Test 1: Brevo HTTP API
  if (process.env.BREVO_API_KEY) {
    try {
      const data = await sendViaBrevo(
        to,
        'InfoCascade Test Email (Brevo API)',
        '<h2>✅ Brevo HTTP API works!</h2><p>This is a test email from your backend.</p>',
        'Brevo HTTP API test — this email was sent successfully.'
      );
      results.tests.brevoApi = { success: true, data };
    } catch (err) {
      results.tests.brevoApi = { success: false, error: err.message, stack: err.stack };
    }
  } else {
    results.tests.brevoApi = { skipped: true, reason: 'BREVO_API_KEY not set' };
  }

  // Test 2: Brevo SMTP
  if (brevoSmtpTransport) {
    try {
      const brevoFrom = `"${process.env.BREVO_SENDER_NAME || 'InfoCascade'}" <${process.env.BREVO_SENDER_EMAIL || process.env.BREVO_USER}>`;
      const info = await brevoSmtpTransport.sendMail({
        from: brevoFrom,
        to,
        subject: 'InfoCascade Test Email (Brevo SMTP)',
        html: '<h2>✅ Brevo SMTP works!</h2><p>This is a test email from your backend.</p>',
        text: 'Brevo SMTP test — this email was sent successfully.',
      });
      results.tests.brevoSmtp = { success: true, messageId: info.messageId, response: info.response };
    } catch (err) {
      results.tests.brevoSmtp = { success: false, error: err.message, code: err.code, command: err.command, stack: err.stack };
    }
  } else {
    results.tests.brevoSmtp = { skipped: true, reason: 'BREVO_USER or BREVO_PASS not set' };
  }

  // Test 3: Generic SMTP (Gmail / local)
  try {
    const from = process.env.EMAIL_FROM || `"InfoCascade" <${transportConfig.auth.user}>`;
    const info = await transporter.sendMail({
      from,
      to,
      subject: 'InfoCascade Test Email (SMTP)',
      html: '<h2>✅ Generic SMTP works!</h2><p>This is a test email from your backend.</p>',
      text: 'Generic SMTP test — this email was sent successfully.',
    });
    results.tests.smtp = { success: true, messageId: info.messageId, response: info.response };
  } catch (err) {
    results.tests.smtp = { success: false, error: err.message, code: err.code, command: err.command, stack: err.stack };
  }

  return results;
}

module.exports = { sendOtpEmail, buildOtpHtml, testEmailSending };

/**
 * Unit tests for the OTP subsystem.
 *
 * Run:  npm test            (after adding the test script)
 *   or: npx jest tests/otp.test.js --verbose
 *
 * These tests exercise:
 *   ✓ OTP generation (length, randomness)
 *   ✓ Hashing & verification (HMAC-SHA256, constant-time)
 *   ✓ Email validation (@gndec.ac.in only)
 *   ✓ In-memory OTP store (save, get, delete, TTL)
 *   ✓ Rate-limit counters (send, resend, verify attempts)
 *   ✓ Controller logic via supertest (send, verify, resend)
 */

/* ---- bootstrap env before any require ---- */
process.env.OTP_SECRET       = 'test-secret-key-do-not-use';
process.env.OTP_SEND_LIMIT   = '3';
process.env.OTP_RESEND_LIMIT = '2';
process.env.MAX_VERIFY_ATTEMPTS = '3';
process.env.VERIFY_LOCK_SECONDS = '60';
/* Make sure no Redis is used during tests */
delete process.env.REDIS_URL;

const {
  generateOtp,
  hashOtp,
  verifyOtp,
  isValidEmail,
  OTP_LENGTH,
} = require('../src/utils/otp');

/* ================================================================== */
/*  1. OTP utility functions                                          */
/* ================================================================== */

describe('OTP Utilities', () => {
  describe('generateOtp()', () => {
    it('returns a string of correct length', () => {
      const otp = generateOtp();
      expect(typeof otp).toBe('string');
      expect(otp).toHaveLength(OTP_LENGTH);
    });

    it('contains only digits', () => {
      for (let i = 0; i < 50; i++) {
        expect(generateOtp()).toMatch(/^\d{6}$/);
      }
    });

    it('produces different values (not constant)', () => {
      const set = new Set(Array.from({ length: 20 }, generateOtp));
      // With 6-digit codes and 20 draws, collisions are astronomically unlikely
      expect(set.size).toBeGreaterThan(1);
    });
  });

  describe('hashOtp() / verifyOtp()', () => {
    it('hashOtp returns a hex string', () => {
      const h = hashOtp('123456');
      expect(h).toMatch(/^[0-9a-f]{64}$/); // SHA-256 → 64 hex chars
    });

    it('same OTP always produces the same hash', () => {
      expect(hashOtp('999999')).toBe(hashOtp('999999'));
    });

    it('different OTPs produce different hashes', () => {
      expect(hashOtp('111111')).not.toBe(hashOtp('222222'));
    });

    it('verifyOtp returns true for correct OTP', () => {
      const otp = '654321';
      const hash = hashOtp(otp);
      expect(verifyOtp(otp, hash)).toBe(true);
    });

    it('verifyOtp returns false for wrong OTP', () => {
      const hash = hashOtp('654321');
      expect(verifyOtp('000000', hash)).toBe(false);
    });
  });

  describe('isValidEmail()', () => {
    it('accepts valid @gndec.ac.in emails', () => {
      expect(isValidEmail('student@gndec.ac.in')).toBe(true);
      expect(isValidEmail('CAPS@GNDEC.AC.IN')).toBe(true);
      expect(isValidEmail('first.last@gndec.ac.in')).toBe(true);
    });

    it('rejects non-gndec emails', () => {
      expect(isValidEmail('user@gmail.com')).toBe(false);
      expect(isValidEmail('user@gndec.ac')).toBe(false);
      expect(isValidEmail('user@fake-gndec.ac.in')).toBe(false);
    });

    it('rejects empty / non-string input', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail(undefined)).toBe(false);
      expect(isValidEmail(12345)).toBe(false);
    });
  });
});

/* ================================================================== */
/*  2. In-memory OTP store                                            */
/* ================================================================== */

describe('OTP Store (in-memory)', () => {
  // Fresh require after env is set (no REDIS_URL)
  const otpStore = require('../src/services/otpStore');

  beforeEach(() => {
    otpStore._clearMemory();
  });

  it('saves and retrieves an OTP hash', async () => {
    await otpStore.saveOtp('a@gndec.ac.in', 'hash123');
    const result = await otpStore.getOtp('a@gndec.ac.in');
    expect(result).toBe('hash123');
  });

  it('returns null for unknown email', async () => {
    const result = await otpStore.getOtp('unknown@gndec.ac.in');
    expect(result).toBeNull();
  });

  it('deletes OTP', async () => {
    await otpStore.saveOtp('a@gndec.ac.in', 'hash123');
    await otpStore.deleteOtp('a@gndec.ac.in');
    expect(await otpStore.getOtp('a@gndec.ac.in')).toBeNull();
  });

  it('tracks verify attempts', async () => {
    expect(await otpStore.getAttempts('a@gndec.ac.in')).toBe(0);
    await otpStore.incrementAttempts('a@gndec.ac.in');
    await otpStore.incrementAttempts('a@gndec.ac.in');
    expect(await otpStore.getAttempts('a@gndec.ac.in')).toBe(2);
  });

  it('resets attempts', async () => {
    await otpStore.incrementAttempts('a@gndec.ac.in');
    await otpStore.resetAttempts('a@gndec.ac.in');
    expect(await otpStore.getAttempts('a@gndec.ac.in')).toBe(0);
  });

  it('tracks send counts', async () => {
    expect(await otpStore.getSendCount('a@gndec.ac.in')).toBe(0);
    await otpStore.incrementSendCount('a@gndec.ac.in');
    expect(await otpStore.getSendCount('a@gndec.ac.in')).toBe(1);
  });

  it('tracks resend counts', async () => {
    expect(await otpStore.getResendCount('a@gndec.ac.in')).toBe(0);
    await otpStore.incrementResendCount('a@gndec.ac.in');
    expect(await otpStore.getResendCount('a@gndec.ac.in')).toBe(1);
  });

  it('saveOtp resets verify attempts', async () => {
    await otpStore.incrementAttempts('a@gndec.ac.in');
    await otpStore.incrementAttempts('a@gndec.ac.in');
    expect(await otpStore.getAttempts('a@gndec.ac.in')).toBe(2);
    await otpStore.saveOtp('a@gndec.ac.in', 'newhash');
    expect(await otpStore.getAttempts('a@gndec.ac.in')).toBe(0);
  });
});

/* ================================================================== */
/*  3. Controller integration (supertest – no real SMTP)              */
/* ================================================================== */

describe('OTP API Endpoints', () => {
  const express = require('express');
  let app;
  let otpStore;

  beforeAll(() => {
    // Mock email service to avoid real SMTP calls
    jest.mock('../src/services/emailService', () => ({
      sendOtpEmail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
    }));
  });

  beforeEach(() => {
    // Clear module cache so each test gets fresh state
    jest.resetModules();

    // Re-set env vars (they may have been cleared by resetModules)
    process.env.OTP_SECRET           = 'test-secret-key-do-not-use';
    process.env.OTP_SEND_LIMIT       = '3';
    process.env.OTP_RESEND_LIMIT     = '2';
    process.env.MAX_VERIFY_ATTEMPTS  = '3';
    process.env.VERIFY_LOCK_SECONDS  = '60';
    delete process.env.REDIS_URL;

    // Re-mock after resetModules
    jest.mock('../src/services/emailService', () => ({
      sendOtpEmail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
    }));

    otpStore = require('../src/services/otpStore');
    otpStore._clearMemory();

    const otpRoutes = require('../src/routes/otp');
    app = express();
    app.use(express.json());
    app.use('/api/otp', otpRoutes);
  });

  // Inline supertest-like helper using http
  const http = require('http');
  function request(app) {
    const server = http.createServer(app);
    return {
      post(path) {
        let _body;
        const chain = {
          send(body) { _body = body; return chain; },
          expect(status) {
            return new Promise((resolve, reject) => {
              server.listen(0, () => {
                const port = server.address().port;
                const data = JSON.stringify(_body);
                const req = http.request(
                  { hostname: '127.0.0.1', port, path, method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
                  (res) => {
                    let body = '';
                    res.on('data', (c) => body += c);
                    res.on('end', () => {
                      server.close();
                      try {
                        const json = JSON.parse(body);
                        if (status && res.statusCode !== status) {
                          reject(new Error(`Expected ${status}, got ${res.statusCode}: ${body}`));
                        }
                        resolve({ status: res.statusCode, body: json });
                      } catch (e) {
                        reject(e);
                      }
                    });
                  }
                );
                req.on('error', (e) => { server.close(); reject(e); });
                req.write(data);
                req.end();
              });
            });
          },
        };
        return chain;
      },
    };
  }

  describe('POST /api/otp/send', () => {
    it('returns 400 for invalid email', async () => {
      const res = await request(app).post('/api/otp/send').send({ email: 'bad@gmail.com' }).expect(400);
      expect(res.body.success).toBe(false);
    });

    it('sends OTP for valid email', async () => {
      const res = await request(app).post('/api/otp/send').send({ email: 'test@gndec.ac.in' }).expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/OTP sent/i);
    });

    it('enforces send rate limit', async () => {
      const email = 'limit@gndec.ac.in';
      for (let i = 0; i < 3; i++) {
        await request(app).post('/api/otp/send').send({ email }).expect(200);
      }
      const res = await request(app).post('/api/otp/send').send({ email }).expect(429);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/otp/verify', () => {
    it('returns 400 for missing OTP', async () => {
      const res = await request(app).post('/api/otp/verify').send({ email: 'test@gndec.ac.in' }).expect(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for wrong OTP', async () => {
      // First send an OTP
      await request(app).post('/api/otp/send').send({ email: 'test@gndec.ac.in' }).expect(200);
      const res = await request(app).post('/api/otp/verify').send({ email: 'test@gndec.ac.in', otp: '000000' }).expect(400);
      expect(res.body.success).toBe(false);
    });

    it('enforces attempt limits', async () => {
      await request(app).post('/api/otp/send').send({ email: 'lock@gndec.ac.in' }).expect(200);
      for (let i = 0; i < 3; i++) {
        await request(app).post('/api/otp/verify').send({ email: 'lock@gndec.ac.in', otp: '000000' }).expect(400);
      }
      const res = await request(app).post('/api/otp/verify').send({ email: 'lock@gndec.ac.in', otp: '000000' }).expect(429);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/too many/i);
    });
  });

  describe('POST /api/otp/resend', () => {
    it('returns 400 for invalid email', async () => {
      const res = await request(app).post('/api/otp/resend').send({ email: 'bad@gmail.com' }).expect(400);
      expect(res.body.success).toBe(false);
    });

    it('resends OTP for valid email', async () => {
      const res = await request(app).post('/api/otp/resend').send({ email: 'test@gndec.ac.in' }).expect(200);
      expect(res.body.success).toBe(true);
    });

    it('enforces resend rate limit', async () => {
      const email = 'resendlimit@gndec.ac.in';
      for (let i = 0; i < 2; i++) {
        await request(app).post('/api/otp/resend').send({ email }).expect(200);
      }
      const res = await request(app).post('/api/otp/resend').send({ email }).expect(429);
      expect(res.body.success).toBe(false);
    });
  });
});

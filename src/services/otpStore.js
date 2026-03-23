/**
 * OTP Store – abstracts OTP persistence with TTL.
 *
 * Tries to connect to Redis (REDIS_URL env var). Falls back to an
 * in-memory Map with manual TTL expiry – suitable for development only.
 *
 * Key schema:
 *   otp:<email>          → hashed OTP string
 *   otp:attempts:<email> → number of failed verify attempts
 *   otp:send:<email>     → number of send requests this window
 *   otp:resend:<email>   → number of resend requests this window
 */

const Redis = require('ioredis');

const OTP_TTL = require('../utils/otp').OTP_TTL_SECONDS;        // 300 s
const MAX_VERIFY_ATTEMPTS = parseInt(process.env.MAX_VERIFY_ATTEMPTS, 10) || 5;
const VERIFY_LOCK_SECONDS = parseInt(process.env.VERIFY_LOCK_SECONDS, 10) || 15 * 60; // 15 min
const SEND_LIMIT           = parseInt(process.env.OTP_SEND_LIMIT, 10) || 5;
const SEND_WINDOW_SECONDS  = parseInt(process.env.OTP_SEND_WINDOW, 10) || 3600;       // 1 hour
const RESEND_LIMIT         = parseInt(process.env.OTP_RESEND_LIMIT, 10) || 3;
const RESEND_WINDOW_SECONDS = parseInt(process.env.OTP_RESEND_WINDOW, 10) || 3600;

/* ---------- Redis / in-memory adapter ---------- */

let redis = null;
let useRedis = false;

function initRedis() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.log('[OTP Store] REDIS_URL not set – using in-memory store (dev only)');
    return;
  }
  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 3000),
    });
    redis.on('connect', () => {
      useRedis = true;
      console.log('[OTP Store] Connected to Redis');
    });
    redis.on('error', (err) => {
      console.error('[OTP Store] Redis error – falling back to memory:', err.message);
      useRedis = false;
    });
  } catch (err) {
    console.error('[OTP Store] Could not create Redis client:', err.message);
  }
}

initRedis();

/* ---------- In-memory fallback ---------- */

const memStore = new Map();

function memSet(key, value, ttl) {
  const expiry = Date.now() + ttl * 1000;
  memStore.set(key, { value, expiry });
}

function memGet(key) {
  const entry = memStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    memStore.delete(key);
    return null;
  }
  return entry.value;
}

function memDel(key) {
  memStore.delete(key);
}

function memIncr(key, ttl) {
  const entry = memStore.get(key);
  if (!entry || Date.now() > entry.expiry) {
    memSet(key, '1', ttl);
    return 1;
  }
  const next = parseInt(entry.value, 10) + 1;
  entry.value = String(next);
  return next;
}

/* ---------- Unified interface ---------- */

function k(prefix, email) {
  return `${prefix}:${email.toLowerCase().trim()}`;
}

const store = {
  /* ---- OTP hash ---- */

  async saveOtp(email, hashedOtp) {
    const key = k('otp', email);
    if (useRedis) {
      await redis.set(key, hashedOtp, 'EX', OTP_TTL);
    } else {
      memSet(key, hashedOtp, OTP_TTL);
    }
    // reset verify attempts on new OTP
    await store.resetAttempts(email);
  },

  async getOtp(email) {
    const key = k('otp', email);
    if (useRedis) return redis.get(key);
    return memGet(key);
  },

  async deleteOtp(email) {
    const key = k('otp', email);
    if (useRedis) await redis.del(key);
    else memDel(key);
  },

  /* ---- Verify-attempt tracking ---- */

  async incrementAttempts(email) {
    const key = k('otp:attempts', email);
    if (useRedis) {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, VERIFY_LOCK_SECONDS);
      return count;
    }
    return memIncr(key, VERIFY_LOCK_SECONDS);
  },

  async getAttempts(email) {
    const key = k('otp:attempts', email);
    if (useRedis) {
      const v = await redis.get(key);
      return v ? parseInt(v, 10) : 0;
    }
    const v = memGet(key);
    return v ? parseInt(v, 10) : 0;
  },

  async resetAttempts(email) {
    const key = k('otp:attempts', email);
    if (useRedis) await redis.del(key);
    else memDel(key);
  },

  /* ---- Send / Resend rate-limit counters ---- */

  async incrementSendCount(email) {
    const key = k('otp:send', email);
    if (useRedis) {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, SEND_WINDOW_SECONDS);
      return count;
    }
    return memIncr(key, SEND_WINDOW_SECONDS);
  },

  async getSendCount(email) {
    const key = k('otp:send', email);
    if (useRedis) {
      const v = await redis.get(key);
      return v ? parseInt(v, 10) : 0;
    }
    const v = memGet(key);
    return v ? parseInt(v, 10) : 0;
  },

  async incrementResendCount(email) {
    const key = k('otp:resend', email);
    if (useRedis) {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, RESEND_WINDOW_SECONDS);
      return count;
    }
    return memIncr(key, RESEND_WINDOW_SECONDS);
  },

  async getResendCount(email) {
    const key = k('otp:resend', email);
    if (useRedis) {
      const v = await redis.get(key);
      return v ? parseInt(v, 10) : 0;
    }
    const v = memGet(key);
    return v ? parseInt(v, 10) : 0;
  },

  /* ---- Email verification status (for forgot password) ---- */

  async markEmailVerified(email) {
    const key = k('verified', email);
    const VERIFIED_TTL = 600; // 10 minutes to use verified status
    if (useRedis) {
      await redis.set(key, 'true', 'EX', VERIFIED_TTL);
    } else {
      memSet(key, 'true', VERIFIED_TTL);
    }
  },

  async isEmailVerified(email) {
    const key = k('verified', email);
    if (useRedis) {
      const v = await redis.get(key);
      return v === 'true';
    }
    const v = memGet(key);
    return v === 'true';
  },

  async clearEmailVerified(email) {
    const key = k('verified', email);
    if (useRedis) await redis.del(key);
    else memDel(key);
  },
    /* ---- Email verification status (for forgot password) ---- */

  async markEmailVerified(email) {
    const key = k('verified', email);
    const VERIFIED_TTL = 600; // 10 minutes to use verified status
    if (useRedis) {
      await redis.set(key, 'true', 'EX', VERIFIED_TTL);
    } else {
      memSet(key, 'true', VERIFIED_TTL);
    }
  },

  async isEmailVerified(email) {
    const key = k('verified', email);
    if (useRedis) {
      const v = await redis.get(key);
      return v === 'true';
    }
    const v = memGet(key);
    return v === 'true';
  },

  async clearEmailVerified(email) {
    const key = k('verified', email);
    if (useRedis) await redis.del(key);
    else memDel(key);
  },

/* ---- constants exposed for controllers ---- */
  MAX_VERIFY_ATTEMPTS,
  VERIFY_LOCK_SECONDS,
  SEND_LIMIT,
  RESEND_LIMIT,

  /* ---- lifecycle ---- */
  async disconnect() {
    if (redis) await redis.quit();
  },

  /** Expose for tests */
  _clearMemory() {
    memStore.clear();
  },
};

module.exports = store;

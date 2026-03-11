# OTP System – Setup & Usage Guide

## Overview

Server-side OTP (One-Time Password) system for InfoCascade email verification.  
Generates secure 6-digit codes, hashes them with HMAC-SHA256, stores with TTL, and sends via SMTP.

### Architecture

```
Frontend                    Backend                         Store
───────                    ─────────                       ──────
POST /api/otp/send    →   generate OTP                 →  HMAC hash → Redis / Memory
                          send email (Nodemailer)          SET otp:<email> EX 300

POST /api/otp/verify  →   compare HMAC(input)          →  GET otp:<email>
                          vs stored hash                   DEL on success

POST /api/otp/resend  →   invalidate old, generate new →  DEL + SET new hash
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SMTP_HOST` / `EMAIL_HOST` | ✅ | `smtp.gmail.com` | SMTP server hostname |
| `SMTP_PORT` / `EMAIL_PORT` | ✅ | `587` | SMTP port |
| `SMTP_USER` / `EMAIL_USER` | ✅ | — | SMTP auth username |
| `SMTP_PASS` / `EMAIL_PASS` | ✅ | — | SMTP auth password / app password |
| `EMAIL_FROM` | | auto | Sender display name |
| `OTP_SECRET` | ✅ | (fallback) | HMAC secret for hashing OTPs |
| `REDIS_URL` | | — | Redis connection URL; omit for in-memory dev store |
| `API_RATE_LIMIT` | | `30` | Max OTP requests per IP per hour |
| `OTP_SEND_LIMIT` | | `5` | Max sends per email per hour |
| `OTP_RESEND_LIMIT` | | `3` | Max resends per email per hour |
| `MAX_VERIFY_ATTEMPTS` | | `5` | Failed verify attempts before lockout |
| `VERIFY_LOCK_SECONDS` | | `900` | Lockout duration in seconds |

Copy `.env.example` → `.env` and fill in your values.

---

## Quick Start

```bash
# Install dependencies
npm install

# Start in dev mode (in-memory OTP store, no Redis needed)
npm run dev

# Or with Redis
REDIS_URL=redis://localhost:6379 npm run dev
```

---

## API Endpoints

### 1. Send OTP

```
POST /api/otp/send
Content-Type: application/json

{ "email": "student@gndec.ac.in" }
```

**Responses:**

| Status | Body |
|--------|------|
| 200 | `{ "success": true, "message": "OTP sent to your email." }` |
| 400 | `{ "success": false, "message": "Invalid email..." }` |
| 429 | `{ "success": false, "message": "OTP send limit reached..." }` |

### 2. Resend OTP

```
POST /api/otp/resend
Content-Type: application/json

{ "email": "student@gndec.ac.in" }
```

Invalidates any previous OTP and sends a fresh one. Subject to resend limits.

| Status | Body |
|--------|------|
| 200 | `{ "success": true, "message": "A new OTP has been sent..." }` |
| 429 | `{ "success": false, "message": "Resend limit reached..." }` |

### 3. Verify OTP

```
POST /api/otp/verify
Content-Type: application/json

{ "email": "student@gndec.ac.in", "otp": "482916" }
```

| Status | Body |
|--------|------|
| 200 | `{ "success": true, "message": "Email verified successfully." }` |
| 400 | `{ "success": false, "message": "OTP is invalid or has expired." }` |
| 429 | `{ "success": false, "message": "Too many failed attempts..." }` |

---

## Example curl Requests

```bash
# 1. Send OTP
curl -s -X POST http://localhost:5000/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{"email": "student@gndec.ac.in"}'

# 2. Verify OTP (replace 123456 with the code from your email)
curl -s -X POST http://localhost:5000/api/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"email": "student@gndec.ac.in", "otp": "123456"}'

# 3. Resend OTP
curl -s -X POST http://localhost:5000/api/otp/resend \
  -H "Content-Type: application/json" \
  -d '{"email": "student@gndec.ac.in"}'
```

---

## Frontend Integration Example

```javascript
// ---- Send OTP ----
const sendOtp = async (email) => {
  const res = await fetch('/api/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return res.json();  // { success: true, message: "OTP sent..." }
};

// ---- Verify OTP ----
const verifyOtp = async (email, otp) => {
  const res = await fetch('/api/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  return res.json();  // { success: true } or { success: false, message: "..." }
};

// ---- Resend OTP ----
const resendOtp = async (email) => {
  const res = await fetch('/api/otp/resend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return res.json();
};
```

---

## Running Tests

```bash
# Install Jest (if not already installed)
npm install --save-dev jest

# Run all OTP tests
npx jest tests/otp.test.js --verbose
```

Tests cover:
- OTP generation (length, randomness, digit-only)
- HMAC hashing & constant-time verification
- Email validation (`@gndec.ac.in` only)
- In-memory store: save, get, delete, TTL, counters
- API integration: send, verify, resend, rate limits

---

## Docker Compose (Redis)

Create a `docker-compose.yml` in the project root:

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

  app:
    build: .
    ports:
      - '5000:5000'
    environment:
      - REDIS_URL=redis://redis:6379
      - SMTP_HOST=smtp.gmail.com
      - SMTP_PORT=587
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
      - OTP_SECRET=${OTP_SECRET}
      - MONGO_URI=${MONGO_URI}
    depends_on:
      - redis

volumes:
  redis-data:
```

```bash
# Start everything
docker compose up -d

# Check logs
docker compose logs -f app
```

---

## Security Checklist

- [x] OTPs generated with `crypto.randomInt` (CSPRNG)
- [x] Only HMAC-SHA256 hashes stored – never plaintext OTPs
- [x] Constant-time comparison via `crypto.timingSafeEqual`
- [x] 5-minute TTL auto-expires OTPs
- [x] Per-email send & resend rate limits
- [x] Verify attempt throttling with lockout
- [x] Per-IP rate limiting (express-rate-limit)
- [x] Email domain validation (`@gndec.ac.in`)
- [x] Consistent error messages (no information leakage)
- [x] Audit logging (no secrets in logs)

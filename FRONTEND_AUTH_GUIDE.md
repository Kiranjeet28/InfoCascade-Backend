# 🔐 Frontend Implementation Guide: Failed Login Protection & OTP Verification

## Overview

The backend now implements a **multi-page authentication flow** that protects against brute force attacks by routing users to OTP verification after 3 failed password attempts.

### Two-Page Authentication System

- **Page 1**: Standard password login
- **Page 2**: OTP verification (triggered after 3 failed attempts)

---

## 📱 Authentication API Endpoints

### 1. **POST /api/auth/signup** - Create Account

Create a new user account with password.

**Request:**
```javascript
POST /api/auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "code": "SIGNUP_SUCCESS",
  "message": "Account created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "code": "WEAK_PASSWORD",
  "message": "Password must be at least 8 characters long",
  "requirement": "minimum 8 characters"
}
```

---

### 2. **POST /api/auth/login** - Password Login (Page 1)

Standard email/password login with failed attempt tracking.

**Request:**
```javascript
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "code": "LOGIN_SUCCESS",
  "message": "Login successful",
  "page": 1,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Response (Wrong Password - 1st/2nd Attempt - 401):**
```json
{
  "success": false,
  "code": "INVALID_PASSWORD",
  "message": "Invalid password",
  "attemptsRemaining": 2,
  "maxAttempts": 3,
  "failedAttempts": 1,
  "warning": "You have 2 attempt(s) remaining before OTP verification is required"
}
```

**Response (Wrong Password - 3rd Attempt / Max Exceeded - 403):**
```json
{
  "success": false,
  "code": "OTP_VERIFICATION_REQUIRED",
  "message": "Too many failed attempts. OTP verification required.",
  "requireOTP": true,
  "page": 2,
  "failedAttempts": 3,
  "message": "Maximum password attempts reached. Please verify with OTP to proceed"
}
```

**Response (User Not Found - 401):**
```json
{
  "success": false,
  "code": "USER_NOT_FOUND",
  "message": "User not found",
  "field": "email"
}
```

---

### 3. **GET /api/auth/check-otp-requirement/:email** - Check OTP Status

Check if a user requires OTP verification (after failed attempts).

**Request:**
```javascript
GET /api/auth/check-otp-requirement/john@example.com
```

**Response (OTP Required - 200):**
```json
{
  "success": true,
  "code": "OTP_CHECK_COMPLETE",
  "requireOTP": true,
  "page": 2,
  "message": "OTP verification required"
}
```

**Response (Normal Login Available - 200):**
```json
{
  "success": true,
  "code": "OTP_CHECK_COMPLETE",
  "requireOTP": false,
  "page": 1,
  "message": "Normal login available"
}
```

---

### 4. **POST /api/auth/login-otp** - OTP Verification Login (Page 2)

Login using OTP after password attempts exceeded.

**Request:**
```javascript
POST /api/auth/login-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "code": "LOGIN_OTP_SUCCESS",
  "message": "OTP verification successful. Login complete.",
  "page": 1,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

---

### 5. **GET /api/auth/verify** - Verify Token

Verify if a JWT token is valid.

**Request:**
```javascript
GET /api/auth/verify
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (Valid - 200):**
```json
{
  "success": true,
  "code": "TOKEN_VALID",
  "message": "Token is valid",
  "valid": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "john@example.com"
  }
}
```

**Response (Expired - 401):**
```json
{
  "success": false,
  "code": "TOKEN_EXPIRED",
  "message": "Token has expired",
  "valid": false,
  "expiredAt": "2026-03-21T10:30:00Z"
}
```

---

### 6. **POST /api/auth/logout** - Logout

Clear session and reset failed attempts.

**Request:**
```javascript
POST /api/auth/logout
Content-Type: application/json

{
  "email": "john@example.com"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "code": "LOGOUT_SUCCESS",
  "message": "Logged out successfully"
}
```

---

## 🎨 Frontend Implementation Examples

### React Component - Two-Page Authentication

```jsx
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AuthFlow() {
  const [page, setPage] = useState(1); // 1: Login, 2: OTP
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);

  // Handle password login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password,
      });

      // Login successful
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      const data = err.response?.data;

      // Handle OTP requirement
      if (data?.code === 'OTP_VERIFICATION_REQUIRED') {
        setPage(2); // Move to OTP page
        setError(data.message);
        // Trigger OTP sending
        await sendOTP(email);
      } 
      // Handle invalid password with attempts tracking
      else if (data?.code === 'INVALID_PASSWORD') {
        setError(`${data.message}. ${data.warning}`);
        setAttemptsRemaining(data.attemptsRemaining);
      } 
      // Other errors
      else {
        setError(data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Send OTP to user email
  const sendOTP = async (userEmail) => {
    try {
      await axios.post('http://localhost:5000/api/otp/send', {
        email: userEmail,
      });
    } catch (err) {
      console.error('Failed to send OTP:', err);
    }
  };

  // Handle OTP verification
  const handleOTPVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login-otp', {
        email,
        otp,
      });

      // OTP verification successful
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // Check OTP requirement on component mount
  useEffect(() => {
    const checkOTPRequirement = async () => {
      if (!email) return;

      try {
        const response = await axios.get(
          `http://localhost:5000/api/auth/check-otp-requirement/${email}`
        );
        
        if (response.data.requireOTP) {
          setPage(2);
        }
      } catch (err) {
        console.error('Failed to check OTP requirement:', err);
      }
    };

    checkOTPRequirement();
  }, [email]);

  return (
    <div className="auth-container">
      <div className="auth-card">
        {page === 1 ? (
          // PAGE 1: Password Login
          <div>
            <h1>Login</h1>
            
            {error && (
              <div className="alert alert-error">
                ⚠️ {error}
                {attemptsRemaining < 3 && (
                  <p className="warning">
                    Attempts remaining: {attemptsRemaining}
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div className="auth-links">
              <a href="/signup">Create account</a>
              <a href="/forgot-password">Forgot password?</a>
            </div>
          </div>
        ) : (
          // PAGE 2: OTP Verification
          <div>
            <h1>Verify with OTP</h1>
            <p>Too many login attempts. Please verify with OTP to continue.</p>

            {error && (
              <div className="alert alert-error">
                ❌ {error}
              </div>
            )}

            <form onSubmit={handleOTPVerification}>
              <div className="form-group">
                <label>Enter OTP Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                  placeholder="000000"
                  maxLength="6"
                  disabled={loading}
                  required
                  className="otp-input"
                />
                <p className="info">
                  📧 OTP sent to {email}
                </p>
              </div>

              <button 
                type="submit" 
                disabled={loading || otp.length !== 6}
                className="btn btn-primary"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>

            <div className="auth-links">
              <button 
                onClick={() => {
                  setPage(1);
                  setOtp('');
                  setError('');
                }}
                className="btn btn-secondary"
              >
                ← Back to Login
              </button>
              <button 
                onClick={() => sendOTP(email)}
                className="btn btn-link"
              >
                Resend OTP
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### Vue Component - Two-Page Authentication

```vue
<template>
  <div class="auth-container">
    <div class="auth-card">
      <!-- PAGE 1: Password Login -->
      <div v-if="page === 1">
        <h1>Login</h1>
        
        <div v-if="error" class="alert alert-error">
          ⚠️ {{ error }}
          <p v-if="attemptsRemaining < 3" class="warning">
            Attempts remaining: {{ attemptsRemaining }}
          </p>
        </div>

        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label>Email</label>
            <input
              v-model="email"
              type="email"
              placeholder="your@email.com"
              :disabled="loading"
              required
            />
          </div>

          <div class="form-group">
            <label>Password</label>
            <input
              v-model="password"
              type="password"
              placeholder="••••••••"
              :disabled="loading"
              required
            />
          </div>

          <button 
            type="submit" 
            :disabled="loading"
            class="btn btn-primary"
          >
            {{ loading ? 'Logging in...' : 'Login' }}
          </button>
        </form>
      </div>

      <!-- PAGE 2: OTP Verification -->
      <div v-else>
        <h1>Verify with OTP</h1>
        <p>Too many login attempts. Please verify with OTP to continue.</p>

        <div v-if="error" class="alert alert-error">
          ❌ {{ error }}
        </div>

        <form @submit.prevent="handleOTPVerification">
          <div class="form-group">
            <label>Enter OTP Code</label>
            <input
              v-model="otp"
              type="text"
              placeholder="000000"
              maxlength="6"
              :disabled="loading"
              required
              class="otp-input"
            />
            <p class="info">📧 OTP sent to {{ email }}</p>
          </div>

          <button 
            type="submit" 
            :disabled="loading || otp.length !== 6"
            class="btn btn-primary"
          >
            {{ loading ? 'Verifying...' : 'Verify OTP' }}
          </button>
        </form>

        <div class="auth-links">
          <button @click="backToLogin" class="btn btn-secondary">
            ← Back to Login
          </button>
          <button @click="resendOTP" class="btn btn-link">
            Resend OTP
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'AuthFlow',
  data() {
    return {
      page: 1, // 1: Login, 2: OTP
      email: '',
      password: '',
      otp: '',
      loading: false,
      error: '',
      attemptsRemaining: 3,
    };
  },
  methods: {
    async handleLogin() {
      this.loading = true;
      this.error = '';

      try {
        const response = await axios.post('http://localhost:5000/api/auth/login', {
          email: this.email,
          password: this.password,
        });

        // Login successful
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        this.$router.push('/dashboard');
      } catch (err) {
        const data = err.response?.data;

        if (data?.code === 'OTP_VERIFICATION_REQUIRED') {
          this.page = 2;
          this.error = data.message;
          this.sendOTP();
        } else if (data?.code === 'INVALID_PASSWORD') {
          this.error = `${data.message}. ${data.warning}`;
          this.attemptsRemaining = data.attemptsRemaining;
        } else {
          this.error = data?.message || 'Login failed. Please try again.';
        }
      } finally {
        this.loading = false;
      }
    },

    async handleOTPVerification() {
      this.loading = true;
      this.error = '';

      try {
        const response = await axios.post('http://localhost:5000/api/auth/login-otp', {
          email: this.email,
          otp: this.otp,
        });

        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        this.$router.push('/dashboard');
      } catch (err) {
        this.error = err.response?.data?.message || 'OTP verification failed.';
      } finally {
        this.loading = false;
      }
    },

    async sendOTP() {
      try {
        await axios.post('http://localhost:5000/api/otp/send', {
          email: this.email,
        });
      } catch (err) {
        console.error('Failed to send OTP:', err);
      }
    },

    async resendOTP() {
      await this.sendOTP();
      this.error = 'OTP resent to your email';
    },

    backToLogin() {
      this.page = 1;
      this.otp = '';
      this.error = '';
    },
  },
};
</script>
```

---

## 🔄 User Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER AUTHENTICATION                      │
└─────────────────────────────────────────────────────────────┘

                         START
                           │
                           ↓
                    ┌──────────────┐
                    │ Page 1: Login │
                    │ Email/Password│
                    └──────┬───────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ↓                     ↓
         ✅ CORRECT PASSWORD    ❌ WRONG PASSWORD
                │                     │
                ↓                     ↓
           [Issue JWT]      [Track Failed Attempt]
                │                     │
                ↓           ┌─────────┴─────────┐
            DASHBOARD       │                   │
                       1 or 2 attempts      3+ attempts
                            │                   │
                            ↓                   ↓
                       Try Again        ┌──────────────────┐
                                       │ Page 2: OTP       │
                                       │ Verify with OTP   │
                                       └──────┬───────────┘
                                              │
                                    ┌─────────┴──────────┐
                                    │                    │
                                   ✅                   ❌
                                    │                    │
                                    ↓                    ↓
                                [Issue JWT]        [Resend/Try]
                                    │                    │
                                    ↓                    ↓
                                DASHBOARD         Back to OTP
                                    │                    │
                                    └────────┬───────────┘
                                            │
                                      [Clear Attempts]
```

---

## 🛡️ Security Features Implemented

| Feature | Description |
|---------|-------------|
| **Failed Attempt Tracking** | Tracks password login attempts per IP/email |
| **3-Attempt Limit** | After 3 failed attempts, OTP required |
| **OTP Verification** | Alternative login method after failed attempts |
| **Rate Limiting** | 5 auth attempts/hour per IP (prevents brute force) |
| **Token Expiry** | 24-hour JWT token expiration |
| **Password Hashing** | bcrypt with 10 salt rounds |
| **Auto-Clear** | Attempts reset after 1 hour |

---

## 📋 Error Codes Reference

| Code | Status | Meaning |
|------|--------|---------|
| `SIGNUP_SUCCESS` | 201 | Account created successfully |
| `LOGIN_SUCCESS` | 200 | Login successful |
| `INVALID_PASSWORD` | 401 | Wrong password (attempts remaining) |
| `OTP_VERIFICATION_REQUIRED` | 403 | Max attempts exceeded, OTP required |
| `LOGIN_OTP_SUCCESS` | 200 | OTP verification successful |
| `TOKEN_VALID` | 200 | JWT token is valid |
| `TOKEN_EXPIRED` | 401 | JWT token has expired |
| `USER_NOT_FOUND` | 401 | User email not found |
| `USER_EMAIL_ALREADY_EXISTS` | 400 | Email already registered |
| `WEAK_PASSWORD` | 400 | Password less than 8 characters |

---

## 🧪 Testing the Implementation

### Test Wrong Password (3 times)

```bash
# Attempt 1
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong1"}'

# Should return: attemptsRemaining: 2

# Attempt 2
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong2"}'

# Should return: attemptsRemaining: 1

# Attempt 3
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong3"}'

# Should return: OTP_VERIFICATION_REQUIRED, page: 2
```

### Test OTP Login

```bash
# First send OTP
curl -X POST http://localhost:5000/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Then login with OTP
curl -X POST http://localhost:5000/api/auth/login-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'
```

---

## 🚀 Deployment Checklist

- [ ] Install dependencies: `npm install`
- [ ] Add JWT_SECRET to `.env`
- [ ] Configure email service for OTP sending
- [ ] Test signup/login locally
- [ ] Test wrong password flow (3 attempts)
- [ ] Test OTP verification flow
- [ ] Deploy to production
- [ ] Update frontend API endpoints (if different)
- [ ] Monitor failed login attempts

---

## 📞 Support

For issues or questions, refer to:
- [SECURITY.md](./SECURITY.md) - Security documentation
- [SECURITY_SETUP.md](./SECURITY_SETUP.md) - Setup guide

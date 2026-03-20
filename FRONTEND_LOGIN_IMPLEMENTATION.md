# 🔐 Frontend Login Implementation Guide

## Overview
Complete guide for implementing secure login on the frontend with JWT authentication, OTP verification, and error handling.

---

## 🎯 Login Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        LOGIN FLOW                               │
└─────────────────────────────────────────────────────────────────┘

User Enters Credentials
         ↓
[POST] /api/auth/login
         ↓
┌─────────────────────────────────────────────────────────┐
│  Backend Validation                                      │
│  • Check email exists                                    │
│  • Verify password                                        │
│  • Check failed attempts                                  │
└─────────────────────────────────────────────────────────┘
         ↓
    ┌────────────────────┐
    │ Success?           │
    └────────────────────┘
      ✅ Yes          ❌ No
       ↓                ↓
   Store JWT      Check Attempts
   Store User     
   Redirect        ┌─────────────────┐
   Home           │ Attempts < 3?    │
                   └─────────────────┘
                    ✅ Yes      ❌ No
                      ↓           ↓
                   Show      Redirect OTP
                   Error     Verification
                             (Page 2)
```

---

## 📋 API Endpoints

### 1. Login Endpoint
**POST** `/api/auth/login`

**Request Body:**
```javascript
{
  "email": "student@gmail.com",
  "password": "securePassword123"
}
```

**Success Response (200):**
```javascript
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "student@gmail.com",
    "role": "student"
  },
  "expiresIn": "24h"
}
```

**Error - Wrong Password (401):**
```javascript
{
  "success": false,
  "code": "AUTH_INVALID_PASSWORD",
  "message": "Invalid email or password"
}
```

**Error - Max Attempts Exceeded (429):**
```javascript
{
  "success": false,
  "code": "AUTH_MAX_ATTEMPTS_EXCEEDED",
  "message": "Too many failed attempts. Please verify using OTP.",
  "redirect": "/otp-verification"  // Go to Page 2
}
```

### 2. OTP Send Endpoint
**POST** `/api/otp/send`

**Request Body:**
```javascript
{
  "email": "student@gmail.com"
}
```

**Success Response:**
```javascript
{
  "success": true,
  "message": "OTP sent to email"
}
```

### 3. OTP Verify Endpoint
**POST** `/api/otp/verify`

**Request Body:**
```javascript
{
  "email": "student@gmail.com",
  "otp": "123456"
}
```

**Success Response:**
```javascript
{
  "success": true,
  "message": "OTP verified successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "student@gmail.com",
    "role": "student"
  }
}
```

---

## 💻 Frontend Implementation

### Page 1: Login Form

```jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (data.success) {
        // ✅ Login successful
        // Store token
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        // ❌ Login failed
        
        if (data.code === 'AUTH_MAX_ATTEMPTS_EXCEEDED') {
          // Too many failed attempts - redirect to OTP verification
          localStorage.setItem('email', credentials.email);
          navigate('/otp-verification');
        } else {
          // Show error message
          setError(data.message || 'Login failed. Please try again.');
        }
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleLogin}>
        <h1>Login</h1>

        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={credentials.email}
            onChange={handleChange}
            required
            placeholder="student@gmail.com"
          />
        </div>

        <div className="form-group">
          <label>Password:</label>
          <input
            type="password"
            name="password"
            value={credentials.password}
            onChange={handleChange}
            required
            placeholder="••••••••"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <p className="signup-link">
          Don't have an account? <a href="/register">Sign up</a>
        </p>
      </form>
    </div>
  );
}
```

---

### Page 2: OTP Verification (After Max Attempts)

```jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function OTPVerificationPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    // Get email from localStorage (set during login failure)
    const storedEmail = localStorage.getItem('email');
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, []);

  useEffect(() => {
    // Timer for resend OTP button
    if (timer > 0) {
      const interval = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(interval);
    }
  }, [timer]);

  const sendOTP = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('OTP sent to your email');
        setOtpSent(true);
        setTimer(60); // 60 second cooldown
      } else {
        setError(data.message || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Send OTP error:', err);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, otp })
      });

      const data = await response.json();

      if (data.success) {
        // ✅ OTP verified successfully
        setSuccess('OTP verified! Logging you in...');
        
        // Store token and user
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.removeItem('email'); // Clean up
        
        // Redirect after 1 second
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else {
        setError(data.message || 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Verify OTP error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="otp-container">
      <div className="otp-card">
        <h1>OTP Verification</h1>
        <p>Too many login attempts. Please verify using OTP.</p>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
          />
        </div>

        {!otpSent ? (
          <button 
            onClick={sendOTP} 
            disabled={loading || !email}
            className="btn-primary"
          >
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        ) : (
          <>
            <div className="form-group">
              <label>Enter OTP:</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                placeholder="000000"
                maxLength="6"
              />
            </div>

            <button 
              onClick={verifyOTP} 
              disabled={loading || otp.length !== 6}
              className="btn-primary"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <button 
              onClick={sendOTP} 
              disabled={loading || timer > 0}
              className="btn-resend"
            >
              {timer > 0 ? `Resend OTP in ${timer}s` : 'Resend OTP'}
            </button>

            <p className="back-link">
              <a href="/login">Back to Login</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## 🔑 Token Management

### Store Token & User
```javascript
// After successful login
localStorage.setItem('token', response.token);
localStorage.setItem('user', JSON.stringify(response.user));
```

### Use Token in API Calls
```javascript
// Add token to headers for authenticated requests
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
};

fetch('/api/students', { headers });
```

### Clear Token on Logout
```javascript
const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  navigate('/login');
};
```

---

## 🛡️ Error Handling

| Error Code | Status | Action |
|---|---|---|
| `AUTH_INVALID_EMAIL` | 400 | Show "Email not found" |
| `AUTH_INVALID_PASSWORD` | 401 | Show "Wrong password" |
| `AUTH_MAX_ATTEMPTS_EXCEEDED` | 429 | Redirect to OTP verification |
| `AUTH_ACCOUNT_LOCKED` | 403 | Show "Account locked, try later" |
| `RATE_LIMIT_EXCEEDED` | 429 | Show "Too many requests" |

---

## ✨ Best Practices

✅ **Do:**
- Store token in `localStorage` (or `sessionStorage` for more security)
- Show loading states during API calls
- Display clear error messages
- Clear sensitive data on logout
- Validate input before submission
- Use HTTPS in production
- Implement token refresh logic

❌ **Don't:**
- Store password in localStorage
- Make API calls without error handling
- Expose sensitive errors to users ("Wrong password" is fine, but "User not found" is not)
- Store token in `sessionStorage` if you need persistent login
- Trust client-side validation alone

---

## 🔄 Token Refresh (Optional)

If implementing refresh tokens:

```javascript
const refreshToken = async () => {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('refreshToken')}`
      }
    });

    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('token', data.token);
      return data.token;
    } else {
      // Refresh failed - logout user
      localStorage.clear();
      window.location.href = '/login';
    }
  } catch (err) {
    console.error('Token refresh failed:', err);
    localStorage.clear();
    window.location.href = '/login';
  }
};
```

---

## 🧪 Testing Checklist

- [ ] Login with correct credentials works
- [ ] Error shown for wrong password
- [ ] Error shown for non-existent email
- [ ] After 3 failed attempts, OTP verification triggered
- [ ] OTP sent successfully
- [ ] OTP verified successfully
- [ ] Token stored in localStorage
- [ ] User data accessible after login
- [ ] Logout clears token and user data
- [ ] Protected routes redirect to login if no token
- [ ] Token included in API headers for authenticated requests

---

## 🚀 Implementation Steps

1. **Create Login Page Component**
   - Email and password inputs
   - Error display
   - Loading state
   - Submit handler

2. **Create OTP Verification Page**
   - Email display
   - OTP input
   - Send OTP button
   - Verify OTP button
   - Resend timer

3. **Setup API Client**
   - Create function for login
   - Create function for OTP send
   - Create function for OTP verify
   - Add error handling

4. **Setup Authentication Context (Optional)**
   - Store user and token globally
   - Provide logout function
   - Provide login function
   - Provide token getter function

5. **Setup Protected Routes**
   - Create ProtectedRoute component
   - Check token existence
   - Redirect to login if no token

6. **Setup Token in Headers**
   - Create axios/fetch interceptor
   - Add Authorization header to all requests
   - Handle 401 responses

---

## 📝 Example: Complete React Setup

```javascript
// context/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user and token from localStorage on mount
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
    
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    
    if (data.success) {
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

**Ready to implement? Start with Page 1 (Login Form) and move to Page 2 (OTP) after testing!** 🚀

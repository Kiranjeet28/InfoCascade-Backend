# 🚀 Frontend Implementation Quick Start

## Two-Page Authentication Flow

### Page 1: Password Login
```javascript
// User tries to login with email/password
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Responses:**
- ✅ **Success (200)**: Show dashboard, save token
- ❌ **Wrong Password (401)**: Show "X attempts remaining"
- 🔐 **Max Attempts (403)**: Go to Page 2 (OTP)

### Page 2: OTP Verification
```javascript
// User verifies with OTP code
POST /api/auth/login-otp
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
- ✅ **Success (200)**: Show dashboard, save token

---

## React Component (Simple Version)

```jsx
import { useState } from 'react';
import axios from 'axios';

export default function Auth() {
  const [page, setPage] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(3);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      window.location.href = '/dashboard';
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'OTP_VERIFICATION_REQUIRED') {
        setPage(2); // Go to OTP page
        axios.post('/api/otp/send', { email }); // Send OTP
      } else {
        setError(data?.warning || data?.message);
        setAttempts(data?.attemptsRemaining || 3);
      }
    }
  };

  const handleOTP = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/login-otp', { email, otp });
      localStorage.setItem('token', res.data.token);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.message);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto' }}>
      {page === 1 ? (
        <form onSubmit={handleLogin}>
          <h2>Login</h2>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {attempts < 3 && (
            <p style={{ color: 'orange' }}>⚠️ Attempts remaining: {attempts}</p>
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Login</button>
        </form>
      ) : (
        <form onSubmit={handleOTP}>
          <h2>Verify with OTP</h2>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <p>📧 OTP sent to {email}</p>
          <input
            type="text"
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.slice(0, 6))}
            maxLength="6"
            required
          />
          <button type="submit">Verify</button>
          <button onClick={() => setPage(1)}>← Back</button>
        </form>
      )}
    </div>
  );
}
```

---

## Vue Component (Simple Version)

```vue
<template>
  <div style="maxWidth: '400px', margin: '50px auto'">
    <div v-if="page === 1">
      <h2>Login</h2>
      <p v-if="error" style="color: red">{{ error }}</p>
      <p v-if="attempts < 3" style="color: orange">⚠️ Attempts: {{ attempts }}</p>
      <form @submit.prevent="handleLogin">
        <input v-model="email" type="email" placeholder="Email" required />
        <input v-model="password" type="password" placeholder="Password" required />
        <button type="submit">Login</button>
      </form>
    </div>

    <div v-else>
      <h2>Verify with OTP</h2>
      <p v-if="error" style="color: red">{{ error }}</p>
      <p>📧 OTP sent to {{ email }}</p>
      <form @submit.prevent="handleOTP">
        <input v-model="otp" type="text" placeholder="000000" maxlength="6" required />
        <button type="submit">Verify</button>
        <button @click="page = 1">← Back</button>
      </form>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      page: 1,
      email: '',
      password: '',
      otp: '',
      error: '',
      attempts: 3,
    };
  },
  methods: {
    async handleLogin() {
      try {
        const res = await axios.post('/api/auth/login', {
          email: this.email,
          password: this.password,
        });
        localStorage.setItem('token', res.data.token);
        this.$router.push('/dashboard');
      } catch (err) {
        const data = err.response?.data;
        if (data?.code === 'OTP_VERIFICATION_REQUIRED') {
          this.page = 2;
          axios.post('/api/otp/send', { email: this.email });
        } else {
          this.error = data?.warning || data?.message;
          this.attempts = data?.attemptsRemaining || 3;
        }
      }
    },
    async handleOTP() {
      try {
        const res = await axios.post('/api/auth/login-otp', {
          email: this.email,
          otp: this.otp,
        });
        localStorage.setItem('token', res.data.token);
        this.$router.push('/dashboard');
      } catch (err) {
        this.error = err.response?.data?.message;
      }
    },
  },
};
</script>
```

---

## Vanilla JavaScript (No Framework)

```javascript
const apiUrl = 'http://localhost:5000/api';

// Page 1: Login Form
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  try {
    const res = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      // Success
      localStorage.setItem('token', data.token);
      window.location.href = '/dashboard';
    } else if (data.code === 'OTP_VERIFICATION_REQUIRED') {
      // Show OTP page
      showOTPPage();
      sendOTP(email);
    } else {
      // Show error with attempts
      showError(data.warning || data.message);
    }
  } catch (error) {
    showError('Login failed. Try again.');
  }
});

// Page 2: OTP Form
document.getElementById('otpForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const otp = document.getElementById('otp').value;
  
  try {
    const res = await fetch(`${apiUrl}/auth/login-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      localStorage.setItem('token', data.token);
      window.location.href = '/dashboard';
    } else {
      showError(data.message);
    }
  } catch (error) {
    showError('OTP verification failed.');
  }
});

function showOTPPage() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('otpPage').style.display = 'block';
}

function sendOTP(email) {
  fetch(`${apiUrl}/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
}

function showError(message) {
  document.getElementById('error').textContent = message;
  document.getElementById('error').style.display = 'block';
}
```

---

## HTML Structure

```html
<div id="authContainer">
  <!-- PAGE 1: LOGIN -->
  <div id="loginPage">
    <h2>Login</h2>
    <div id="error" style="display:none; color:red;"></div>
    <form id="loginForm">
      <input id="email" type="email" placeholder="Email" required />
      <input id="password" type="password" placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
  </div>

  <!-- PAGE 2: OTP -->
  <div id="otpPage" style="display:none;">
    <h2>Verify with OTP</h2>
    <div id="error" style="display:none; color:red;"></div>
    <p>📧 OTP sent to your email</p>
    <form id="otpForm">
      <input id="otp" type="text" placeholder="000000" maxlength="6" required />
      <button type="submit">Verify OTP</button>
      <button type="button" onclick="goBackToLogin()">← Back</button>
    </form>
  </div>
</div>
```

---

## Error Codes to Handle

| Code | Status | Action |
|------|--------|--------|
| `LOGIN_SUCCESS` | 200 | Save token, redirect to dashboard |
| `INVALID_PASSWORD` | 401 | Show warning + attempts remaining |
| `OTP_VERIFICATION_REQUIRED` | 403 | Switch to Page 2, send OTP |
| `LOGIN_OTP_SUCCESS` | 200 | Save token, redirect to dashboard |
| `USER_NOT_FOUND` | 401 | Show "User not found" |
| `WEAK_PASSWORD` | 400 | Show password requirements |

---

## Key Points for Frontend

✅ **After 3 wrong passwords:**
- Backend returns `OTP_VERIFICATION_REQUIRED` (403)
- Automatically switch to Page 2
- Send OTP to user's email

✅ **User can then:**
- Enter OTP code from email
- Login successfully without password
- Attempts reset for next time

✅ **Error Messages:**
- 1st/2nd attempt: "You have X attempts remaining"
- 3rd attempt: "Too many failed attempts. OTP required"

✅ **Token Management:**
- Save JWT in localStorage
- Send in Authorization header: `Bearer token`
- Token expires in 24 hours

---

## Testing

```bash
# Create test account
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"Test1234"}'

# Try wrong password 3 times
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"WrongPassword"}'

# Last response should have: code: "OTP_VERIFICATION_REQUIRED"

# Send OTP
curl -X POST http://localhost:5000/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}'

# Check your email inbox for OTP

# Login with OTP
curl -X POST http://localhost:5000/api/auth/login-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","otp":"123456"}'
```

---

## Environment Variables

```javascript
// In your frontend .env
REACT_APP_API_URL=http://localhost:5000
# or
VITE_API_URL=http://localhost:5000

// Usage in code
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
```

---

## Quick Checklist

- [ ] Frontend can call `/api/auth/login`
- [ ] Frontend handles 3 error responses
- [ ] Frontend switches to OTP page on 403
- [ ] Frontend calls `/api/otp/send` to trigger email
- [ ] Frontend can call `/api/auth/login-otp`
- [ ] Frontend saves JWT token
- [ ] Frontend redirects to dashboard on success
- [ ] Frontend shows error messages clearly

---

**Need full examples?** See [FRONTEND_AUTH_GUIDE.md](./FRONTEND_AUTH_GUIDE.md)

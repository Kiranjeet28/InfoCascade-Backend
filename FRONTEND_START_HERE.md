# 🎯 FRONTEND DEVELOPER GUIDE - Start Here! 👈

## 📋 What You Need to Know

Your backend now has a **two-page authentication system** that protects against brute force attacks.

### How It Works

```
User tries to login with password
         ↓
User enters correct password?  → SUCCESS: Send JWT token → Dashboard
         │
      NO - Try again (1st time)
         ↓
User enters correct password?  → SUCCESS: Send JWT token → Dashboard
         │
      NO - Try again (2nd time)
         ↓
User enters correct password?  → SUCCESS: Send JWT token → Dashboard
         │
      NO - Max attempts reached! → ROUTE TO OTP PAGE 2
         ↓
Send OTP to user's email
         ↓
User enters OTP code
         ↓
SUCCESS → Send JWT token → Dashboard
```

---

## 🚀 Quick Implementation (5 minutes)

### Step 1: Copy the Component

Choose your framework:
- **React**: [FRONTEND_QUICK_START.md](./FRONTEND_QUICK_START.md) → React Component
- **Vue**: [FRONTEND_QUICK_START.md](./FRONTEND_QUICK_START.md) → Vue Component
- **Vanilla JS**: [FRONTEND_QUICK_START.md](./FRONTEND_QUICK_START.md) → Vanilla JavaScript

Copy the entire component into your project.

### Step 2: Update API URLs

Find this line in the component:
```javascript
const response = await axios.post('http://localhost:5000/api/auth/login', {
```

Replace `http://localhost:5000` with your backend URL:
```javascript
const response = await axios.post(process.env.REACT_APP_API_URL + '/api/auth/login', {
```

### Step 3: Test Locally

```bash
# Terminal 1: Start backend
cd Backend\ InfoCascasde
npm run dev

# Terminal 2: Start frontend
npm run dev

# Browser: Go to http://localhost:3000
```

### Step 4: Test the Flow

1. **Create an account**: 
   - Name: Test User
   - Email: test@test.com
   - Password: TestPassword123

2. **Try wrong password 3 times**:
   - 1st attempt: Show "You have 2 attempts remaining"
   - 2nd attempt: Show "You have 1 attempt remaining"
   - 3rd attempt: Show "Too many failed attempts. OTP required"
   - **UI automatically switches to OTP page**

3. **Verify with OTP**:
   - Check your email for the 6-digit code
   - Enter it and click "Verify OTP"
   - Success! You're logged in

---

## 📱 API Endpoints Reference

### Create Account
```javascript
POST /api/auth/signup
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123"
}
// Returns: { token, user }
```

### Page 1: Login
```javascript
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}

// Success (200):
{ "token": "...", "user": {...}, "page": 1 }

// Wrong password (401):
{ "message": "Invalid password", "attemptsRemaining": 2 }

// Max attempts (403):
{ "code": "OTP_VERIFICATION_REQUIRED", "page": 2, "requireOTP": true }
```

### Check if OTP Required (Optional)
```javascript
GET /api/auth/check-otp-requirement/john@example.com
// Returns: { requireOTP: true/false, page: 1/2 }
```

### Page 2: OTP Verification
```javascript
POST /api/auth/login-otp
{
  "email": "john@example.com",
  "otp": "123456"
}
// Returns: { token, user, page: 1 }
```

### Send OTP
```javascript
POST /api/otp/send
{
  "email": "john@example.com"
}
// Sends OTP to email
```

---

## 🎨 Component Features

The provided components automatically:

✅ Show attempt count (1/3, 2/3, 3/3)
✅ Switch to OTP page after 3 failures
✅ Send OTP email automatically
✅ Handle all error responses
✅ Save JWT token to localStorage
✅ Support token refresh (24-hour expiry)
✅ Show loading states
✅ Validate inputs
✅ Disable buttons during loading

---

## 🛡️ What's Protected

Your users are now protected from:
- **Brute force attacks**: Max 3 attempts, then OTP required
- **DDoS attacks**: Rate limited to 5 auth attempts/hour per IP
- **Password guessing**: After 3 failed, must verify via OTP

---

## 🔐 Store User Session

```javascript
// After successful login
localStorage.setItem('token', response.data.token);
localStorage.setItem('user', JSON.stringify(response.data.user));

// Use token in all API requests
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// Or in each request
axios.get('/api/users', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
```

---

## 📊 Error Handling

The component handles these scenarios:

| Scenario | Action |
|----------|--------|
| **Correct Password** | Show dashboard |
| **Wrong Password (1-2)** | Show "X attempts remaining" |
| **Wrong Password (3)** | Automatically switch to OTP page |
| **Invalid OTP** | Show error, allow retry |
| **Expired Token** | Redirect to login |
| **Network Error** | Show "Check connection" |

---

## 🧪 Test Checklist

- [ ] Account creation works
- [ ] Login with correct password succeeds
- [ ] Wrong password shows attempt count
- [ ] After 3 failures, OTP page appears
- [ ] OTP sent to email
- [ ] OTP verification succeeds
- [ ] JWT token saved and used
- [ ] Dashboard accessible after login
- [ ] Token expiry handled (24 hours)
- [ ] Logout clears token

---

## 📱 Code Templates

### React Component Structure
```jsx
const [page, setPage] = useState(1);
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [otp, setOtp] = useState('');
const [error, setError] = useState('');
const [attempts, setAttempts] = useState(3);

const handleLogin = async (e) => {
  e.preventDefault();
  try {
    const res = await axios.post('/api/auth/login', {
      email, password
    });
    localStorage.setItem('token', res.data.token);
    // Redirect to dashboard
  } catch (err) {
    if (err.response?.data?.code === 'OTP_VERIFICATION_REQUIRED') {
      setPage(2);
    }
  }
};
```

### Save Token Globally (React Context)
```jsx
// AuthContext.js
const AuthContext = React.createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const login = (userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem('token', tokenData);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Usage in components
const { login } = useContext(AuthContext);
login(userData, token);
```

### Protected Route
```jsx
function ProtectedRoute({ children }) {
  const { token } = useContext(AuthContext);
  
  if (!token) {
    return <Navigate to="/login" />;
  }
  
  return children;
}

// Usage
<BrowserRouter>
  <Routes>
    <Route path="/login" element={<Auth />} />
    <Route path="/dashboard" element={
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    } />
  </Routes>
</BrowserRouter>
```

---

## 🚀 Deployment

### Environment Variables
```bash
# .env (React)
REACT_APP_API_URL=https://your-backend.com

# .env (Vue)
VUE_APP_API_URL=https://your-backend.com

# .env.local (general)
VITE_API_URL=https://your-backend.com
```

### Build for Production
```bash
# React
npm run build

# Vue
npm run build

# Vite
npm run build
```

### Deploy
- Upload `dist/` folder to your hosting
- Update CORS_ORIGIN on backend to your frontend domain
- Test login flow in production

---

## 🎓 Learn More

For complete details, read:
1. [FRONTEND_QUICK_START.md](./FRONTEND_QUICK_START.md) - Code examples
2. [FRONTEND_AUTH_GUIDE.md](./FRONTEND_AUTH_GUIDE.md) - Full API reference
3. [FAILED_LOGIN_PROTECTION_SUMMARY.md](./FAILED_LOGIN_PROTECTION_SUMMARY.md) - System overview

---

## ❓ Common Questions

**Q: Where do I put the JWT token?**
A: In localStorage, and send in `Authorization: Bearer <token>` header

**Q: How long does the token last?**
A: 24 hours. After expiry, user must login again.

**Q: What if OTP is wrong?**
A: User can click "Resend OTP" or manually enter correct code

**Q: Can user go back from OTP to password?**
A: Yes! Provide a "← Back to Login" button

**Q: What about password reset?**
A: Not implemented yet. Can be added later if needed.

**Q: How many devices can login at once?**
A: Unlimited. Each device gets its own token.

---

## 📞 Having Issues?

Check these in order:
1. Is backend running? `npm run dev` in Backend folder
2. Are URLs correct? Check `API_URL` in component
3. CORS enabled? Backend has CORS configured
4. Email service working? Check if OTP email arrives
5. Database connected? Check MongoDB connection
6. Tokens being saved? Check browser localStorage

---

## ✨ Features Summary

✅ Two-page authentication (Password + OTP)
✅ Failed attempt tracking (3-attempt limit)
✅ Automatic OTP routing after max attempts
✅ JWT token authentication (24-hour expiry)
✅ Password hashing with bcrypt
✅ Rate limiting (5 attempts/hour)
✅ CORS configured
✅ Security headers included
✅ Error handling complete
✅ Production ready

---

**Status**: 🟢 **Ready to implement!**

Start with [FRONTEND_QUICK_START.md](./FRONTEND_QUICK_START.md) 👉

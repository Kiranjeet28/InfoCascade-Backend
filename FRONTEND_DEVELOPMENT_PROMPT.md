# 🎯 Frontend Development Prompt - Complete Authentication System

## System Prompt for Frontend Developers

You are implementing a **two-page authentication system** with brute force protection. This system automatically routes users to OTP verification after 3 failed password attempts.

---

## 📋 Project Requirements

### Primary Goal
Implement a secure authentication UI with two pages:
- **Page 1**: Email/Password login with attempt tracking
- **Page 2**: OTP verification (triggered after 3 failed attempts)

### Target Users
- New users signing up
- Existing users logging in
- Users who exceed 3 password attempts (automatic OTP routing)

### Success Criteria
✅ Users can sign up with email/password
✅ Users can login with correct credentials
✅ Users see attempt count on wrong password
✅ After 3 failed attempts → automatic OTP page
✅ Users can verify OTP and login
✅ JWT token persisted and used for API calls
✅ All error messages clear and helpful
✅ Responsive design (mobile + desktop)

---

## 🎨 UI/UX Requirements

### Page 1: Login Form
**Elements:**
- [ ] Email input field
- [ ] Password input field
- [ ] "Login" submit button
- [ ] Error message area
- [ ] Attempt counter (show when > 0 failed attempts)
- [ ] "Create account" link
- [ ] "Forgot password?" link (optional)

**Behavior:**
- Show email from local storage if available
- Clear password after failed attempt
- Disable button during loading
- Show loading spinner on button
- Auto-focus on first input
- Enter key submits form

**Error Display:**
```
On 1st/2nd wrong password:
"Invalid password. You have X attempt(s) remaining"

On 3rd wrong password:
"Too many failed attempts. OTP verification required."
(Auto-switch to Page 2)
```

### Page 2: OTP Verification Form
**Elements:**
- [ ] OTP input field (6 digits, numeric only)
- [ ] "Verify OTP" submit button
- [ ] "← Back to Login" button
- [ ] "Resend OTP" button/link
- [ ] Email display (show which email OTP sent to)
- [ ] Error message area
- [ ] Timer for OTP expiry (optional)

**Behavior:**
- Auto-format input to 6 digits
- Disable button until 6 digits entered
- Show loading spinner during verification
- "Resend OTP" disabled for 30 seconds after sending
- Show countdown: "Resend in X seconds"
- Focus on OTP input on page load

**Success:**
```
"OTP verified successfully! Redirecting..."
(Auto-redirect to dashboard after 1 second)
```

---

## 🔌 API Endpoints to Use

### 1. Sign Up
```javascript
POST /api/auth/signup
Request: {
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123!"
}
Response: {
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
Errors:
- 400: WEAK_PASSWORD - "Password must be at least 8 characters"
- 400: USER_EMAIL_ALREADY_EXISTS - "Email already registered"
```

### 2. Login (Page 1)
```javascript
POST /api/auth/login
Request: {
  "email": "john@example.com",
  "password": "Password123!"
}
Response Success (200): {
  "success": true,
  "code": "LOGIN_SUCCESS",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... },
  "page": 1
}
Response Wrong Password (401): {
  "success": false,
  "code": "INVALID_PASSWORD",
  "attemptsRemaining": 2,
  "failedAttempts": 1,
  "warning": "You have 2 attempt(s) remaining before OTP verification"
}
Response Max Attempts (403): {
  "success": false,
  "code": "OTP_VERIFICATION_REQUIRED",
  "requireOTP": true,
  "page": 2,
  "message": "Too many failed attempts. OTP verification required."
}
Errors:
- 401: USER_NOT_FOUND - "User not found"
```

### 3. Check OTP Requirement (Optional)
```javascript
GET /api/auth/check-otp-requirement/:email
Response: {
  "success": true,
  "requireOTP": true/false,
  "page": 1 or 2
}
Purpose: Call when user enters email to determine which page to show
```

### 4. Send OTP
```javascript
POST /api/otp/send
Request: {
  "email": "john@example.com"
}
Response: {
  "success": true,
  "message": "OTP sent to email"
}
Purpose: Send 6-digit code to user's email
Timing: Call after auto-routing to Page 2, and when user clicks "Resend OTP"
```

### 5. Verify OTP (Page 2)
```javascript
POST /api/auth/login-otp
Request: {
  "email": "john@example.com",
  "otp": "123456"
}
Response Success (200): {
  "success": true,
  "code": "LOGIN_OTP_SUCCESS",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... },
  "page": 1
}
Errors:
- 401: INVALID_OTP - "Invalid or expired OTP"
```

### 6. Verify Token (Optional)
```javascript
GET /api/auth/verify
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs..."
}
Response: {
  "success": true,
  "valid": true,
  "user": { ... }
}
Purpose: Check if token is still valid on app load
```

### 7. Logout
```javascript
POST /api/auth/logout
Request: {
  "email": "john@example.com"
}
Response: {
  "success": true,
  "message": "Logged out successfully"
}
Purpose: Clear session on logout
```

---

## 🔐 Authentication Flow

### Sign Up Flow
```
1. User fills signup form (name, email, password)
2. Frontend validates:
   - Email format valid
   - Password >= 8 chars
   - Required fields present
3. Send POST /api/auth/signup
4. Backend validates & creates user
5. If success:
   - Save token to localStorage
   - Save user to localStorage
   - Redirect to dashboard
6. If error:
   - Show error message
   - Keep user on signup form
   - Pre-fill email for retry
```

### Login Flow (Correct Password)
```
1. User enters email & password
2. Frontend sends POST /api/auth/login
3. Backend verifies password
4. If correct:
   - Response includes token
   - Frontend saves token
   - Set Authorization header
   - Redirect to dashboard
5. If error: Show error (next flow)
```

### Login Flow (Wrong Password - Attempts 1-2)
```
1. POST /api/auth/login with wrong password
2. Response 401 with:
   - "attemptsRemaining": 2 or 1
   - "warning": "You have X attempts remaining"
3. Frontend:
   - Shows warning message
   - Shows attempt counter
   - Clears password field
   - Keeps email for retry
   - Allows retry without refreshing
```

### Login Flow (Wrong Password - Attempt 3)
```
1. POST /api/auth/login with wrong password (3rd time)
2. Response 403 with:
   - "code": "OTP_VERIFICATION_REQUIRED"
   - "page": 2
3. Frontend:
   - Shows error message
   - AUTOMATICALLY switches to Page 2
   - Calls POST /api/otp/send to email
   - Shows OTP form
   - User must now verify with OTP
```

### OTP Verification Flow
```
1. User receives 6-digit code in email
2. User enters code on Page 2
3. Frontend validates:
   - Code is 6 digits
   - Code is numeric
4. Sends POST /api/auth/login-otp
5. If success:
   - Response includes token
   - Frontend saves token
   - Show "Verified successfully!"
   - After 1 second → Redirect to dashboard
6. If error:
   - Show "Invalid or expired OTP"
   - Allow user to:
     * Enter correct code
     * Click "Resend OTP" for new code
     * Click "← Back" to try password again
```

---

## 💾 State Management

### Login State to Track
```javascript
const authState = {
  // Current auth status
  isAuthenticated: false,
  user: null,
  token: null,
  
  // Login attempt tracking
  attemptsRemaining: 3,
  totalAttempts: 0,
  
  // UI state
  page: 1, // 1: Login, 2: OTP
  loading: false,
  error: '',
  
  // OTP state
  otpSent: false,
  otpResendCountdown: 0,
  requiresOTP: false,
  
  // Form data
  formData: {
    email: '',
    password: '',
    otp: ''
  }
}
```

### Token Management
```javascript
// On successful login
localStorage.setItem('token', response.data.token);
localStorage.setItem('user', JSON.stringify(response.data.user));

// On app load
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

// In all API requests
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// On logout
localStorage.removeItem('token');
localStorage.removeItem('user');
```

---

## ✅ Implementation Checklist

### Phase 1: Setup
- [ ] Create auth pages/components
- [ ] Set up routing (login → dashboard)
- [ ] Set up state management (Redux/Context/Zustand)
- [ ] Configure API base URL
- [ ] Set up axios/fetch interceptors

### Phase 2: Page 1 (Login)
- [ ] Create email input
- [ ] Create password input
- [ ] Create login button
- [ ] Implement form validation
- [ ] Call /api/auth/login
- [ ] Handle 200 response → Save token → Redirect
- [ ] Handle 401 response → Show warning + attempts
- [ ] Handle 403 response → Switch to Page 2 + Send OTP
- [ ] Show loading state
- [ ] Show error messages

### Phase 3: Page 2 (OTP)
- [ ] Create OTP input (6 digits only)
- [ ] Create "Verify OTP" button
- [ ] Create "← Back to Login" button
- [ ] Create "Resend OTP" button
- [ ] Auto-call /api/otp/send when switching to Page 2
- [ ] Call /api/auth/login-otp
- [ ] Handle 200 response → Show success → Redirect
- [ ] Handle error response → Show error + allow retry
- [ ] Implement resend countdown (disabled 30 seconds)
- [ ] Show OTP expiry time

### Phase 4: Additional Features
- [ ] Save email to localStorage for next login
- [ ] Verify token on app load
- [ ] Handle token expiry (24 hours)
- [ ] Implement logout
- [ ] Add password visibility toggle
- [ ] Add "Forgot password?" link (optional)
- [ ] Add responsive design
- [ ] Add accessibility (labels, ARIA)
- [ ] Add analytics tracking

### Phase 5: Testing
- [ ] Test signup flow
- [ ] Test login with correct password
- [ ] Test wrong password attempts 1-2
- [ ] Test wrong password attempt 3 (OTP routing)
- [ ] Test OTP verification
- [ ] Test token persistence
- [ ] Test logout
- [ ] Test error handling
- [ ] Test responsive design
- [ ] Test with real backend

---

## 🎨 Design Notes

### Color Scheme
```
- Primary: Blue (buttons, active states)
- Error: Red (error messages, invalid inputs)
- Warning: Orange (attempt warnings)
- Success: Green (success messages)
- Background: Light gray / White
- Text: Dark gray / Black
```

### Typography
```
- Headings (h1): 24-28px, bold
- Labels: 14px, semi-bold
- Input text: 16px, regular
- Error text: 14px, regular, red
- Helper text: 12px, gray
```

### Spacing
```
- Form gap: 16px
- Input height: 44px
- Button height: 44px
- Card padding: 32px (desktop), 20px (mobile)
- Page margin: 20px (mobile), 40px (desktop)
```

### Components
```
- Input fields: Rounded 4px, gray border
- Buttons: Rounded 4px, full width
- Error messages: Light red background, red text
- Loading: Spinner or text "Loading..."
- Links: Blue text, no underline (underline on hover)
```

---

## 📱 Responsive Design

### Mobile (< 600px)
- Single column layout
- Full-width inputs/buttons
- Larger touch targets (48px minimum)
- Reduced padding (16px)
- Text size: 16px (prevents zoom on iOS)

### Tablet (600px - 1024px)
- Centered card (400px width)
- Medium padding (24px)
- Text size: 14-16px

### Desktop (> 1024px)
- Centered card (480px width)
- Comfortable padding (32px)
- Text size: 14-16px

---

## 🧪 Test Cases

### Test 1: Successful Login
```
Given: User has valid account
When: User enters correct email and password
Then: 
  - Login button disabled during request
  - Token received and saved
  - User redirected to dashboard
  - Dashboard shows user name
```

### Test 2: Wrong Password (1st Attempt)
```
Given: User on login page
When: User enters wrong password
Then:
  - Page shows "Invalid password"
  - Shows "You have 2 attempts remaining"
  - Password field cleared
  - Email field kept for retry
  - User can retry immediately
```

### Test 3: Wrong Password (3rd Attempt)
```
Given: User has failed 2 times already
When: User enters wrong password 3rd time
Then:
  - Page shows error
  - Page automatically switches to OTP page
  - OTP page shows email
  - "Send OTP" called automatically
  - User receives OTP in email
```

### Test 4: OTP Verification Success
```
Given: User on OTP page with 6-digit code
When: User enters correct code and clicks verify
Then:
  - Button shows loading state
  - Code verified
  - "Verified successfully!" message shown
  - After 1 second: Redirect to dashboard
  - Token saved and available for API calls
```

### Test 5: OTP Resend
```
Given: User on OTP page
When: User clicks "Resend OTP"
Then:
  - Button shows loading state
  - New OTP sent to email
  - Button disabled for 30 seconds
  - Countdown shown: "Resend in 30s"
  - After 30s: Button enabled again
```

### Test 6: Token Persistence
```
Given: User logged in with token
When: User refreshes page
Then:
  - Token retrieved from localStorage
  - User still logged in
  - No need to login again
  - Dashboard accessible
```

### Test 7: Token Expiry
```
Given: User's token is 24+ hours old
When: User makes API request
Then:
  - API returns 401 Unauthorized
  - User redirected to login
  - Error shown: "Session expired. Please login again."
```

---

## 🚨 Error Handling

### HTTP Status Codes
```
200: Success (login, OTP verify, signup)
201: Created (signup)
400: Bad request (validation error, weak password)
401: Unauthorized (wrong password, invalid OTP, expired token)
403: Forbidden (OTP verification required)
429: Rate limited (too many attempts)
500: Server error
```

### User-Friendly Messages
```
Instead of: "Invalid credentials"
Show: "Email or password incorrect. Try again or reset password"

Instead of: "Error 401"
Show: "Session expired. Please login again"

Instead of: "WEAK_PASSWORD"
Show: "Password must be at least 8 characters"

Instead of: "OTP_VERIFICATION_REQUIRED"
Show: "Too many failed attempts. Please verify with OTP"
```

---

## 🔒 Security Best Practices

### Frontend Security
- [ ] Never log tokens to console (production)
- [ ] Never send password in query string
- [ ] Use HTTPS only (production)
- [ ] Clear sensitive data from state on logout
- [ ] Validate inputs before sending (user experience)
- [ ] Don't expose error details (e.g., "Email already exists")
- [ ] Implement CSRF tokens if needed
- [ ] Sanitize any user input in error messages

### Token Handling
- [ ] Store token in httpOnly cookie (if possible) or secure localStorage
- [ ] Send token in Authorization header: `Bearer <token>`
- [ ] Don't store sensitive data (password, etc.) in localStorage
- [ ] Clear token immediately on logout
- [ ] Check token expiry before making requests
- [ ] Implement token refresh if backend supports it

---

## 📊 Analytics to Track (Optional)

```javascript
// Track user actions
analytics.track('signup_started');
analytics.track('signup_completed', { method: 'email' });
analytics.track('login_started');
analytics.track('login_success');
analytics.track('login_failed_attempt_1');
analytics.track('login_failed_attempt_2');
analytics.track('login_failed_attempt_3_otp_required');
analytics.track('otp_sent', { email: masked_email });
analytics.track('otp_verified');
analytics.track('logout');
```

---

## 🚀 Performance Optimization

```javascript
// Lazy load components
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const OTPPage = React.lazy(() => import('./pages/OTPPage'));

// Debounce email validation
const debouncedCheckEmail = debounce(checkEmailExists, 300);

// Cache user data
const cachedUser = useQuery('user', fetchUser, { staleTime: 1000 * 60 * 5 });

// Optimize re-renders
const MemoizedForm = React.memo(LoginForm);
```

---

## 📚 File Structure Recommendation

```
src/
├── pages/
│   ├── LoginPage.jsx          # Page 1: Email/Password
│   ├── OTPPage.jsx             # Page 2: OTP Verification
│   └── SignupPage.jsx          # Sign up page
├── components/
│   ├── LoginForm.jsx
│   ├── OTPForm.jsx
│   ├── SignupForm.jsx
│   └── ProtectedRoute.jsx
├── services/
│   ├── authService.js          # API calls
│   └── tokenService.js         # Token management
├── hooks/
│   ├── useAuth.js              # Auth context hook
│   └── useToken.js             # Token hook
├── context/
│   └── AuthContext.jsx         # Auth state
└── utils/
    ├── validators.js           # Input validation
    └── constants.js            # API URLs, etc.
```

---

## 🎯 Success Metrics

- [ ] User can signup in < 30 seconds
- [ ] User can login successfully in < 20 seconds
- [ ] OTP flow completes in < 60 seconds
- [ ] Error messages shown within 500ms
- [ ] Page loads in < 2 seconds
- [ ] Mobile responsive at all breakpoints
- [ ] All tests passing
- [ ] Zero console errors
- [ ] Accessibility score > 90
- [ ] Code coverage > 80%

---

## 📞 Backend Support

**Backend is running at**: `http://localhost:5000` (development)

**Backend documentation**:
- [FRONTEND_START_HERE.md](./FRONTEND_START_HERE.md) - Quick start
- [FRONTEND_QUICK_START.md](./FRONTEND_QUICK_START.md) - Code examples
- [FRONTEND_AUTH_GUIDE.md](./FRONTEND_AUTH_GUIDE.md) - Full API reference
- [FAILED_LOGIN_PROTECTION_SUMMARY.md](./FAILED_LOGIN_PROTECTION_SUMMARY.md) - System overview

**Test the backend**:
```bash
# Check if backend is running
curl http://localhost:5000/health

# Test signup
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"Test1234"}'
```

---

## ✨ Final Notes

✅ This is a **production-ready** backend
✅ All security measures implemented
✅ Error handling complete
✅ Documentation comprehensive
✅ Ready for immediate implementation

🎯 **Your job**: Build the UI/UX frontend to match this specification

⏱️ **Estimated time**: 8-16 hours (depending on experience)

📝 **When done**: Test thoroughly before production deployment

---

**Good luck! Build something amazing! 🚀**

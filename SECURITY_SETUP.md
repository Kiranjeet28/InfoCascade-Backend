# 🔒 Security Implementation Guide

## Quick Start

This guide walks you through installing and setting up the new security features that protect your app from brute force attacks and DDoS/DoS attacks.

---

## 📦 Installation

### Step 1: Install New Security Dependencies

```bash
npm install
```

This installs the following new security packages:

- **helmet** (^7.1.0) - Sets HTTP security headers
- **express-mongo-sanitize** (^2.2.0) - Prevents NoSQL injection
- **hpp** (^0.2.3) - Prevents HTTP parameter pollution

### Step 2: Verify Installation

```bash
npm list helmet express-mongo-sanitize hpp express-rate-limit
```

Expected output:
```
├── express-mongo-sanitize@2.2.0
├── express-rate-limit@8.3.1
├── helmet@7.1.0
└── hpp@0.2.3
```

---

## ⚙️ Configuration

### Step 1: Environment Variables

Create or update your `.env` file:

```bash
# Copy from .env.example or create new
cp .env.example .env
```

Add these security-related variables:

```bash
# Server
NODE_ENV=production
PORT=5000
REQUEST_TIMEOUT=30000

# Security & Rate Limiting
API_RATE_LIMIT=30              # Requests per hour
CORS_ORIGIN=https://yourdomain.com
SESSION_SECRET=your-secret-key

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
```

### Step 2: Review Security Middleware

**Location**: `src/middleware/securityMiddleware.js`

This file contains:
- ✅ Helmet.js configuration for HTTP headers
- ✅ Global rate limiter (100 req/15 min)
- ✅ Payload size limits (10KB max)
- ✅ NoSQL injection prevention
- ✅ Parameter pollution protection
- ✅ Request timeout (30s)

**No changes needed** - it's pre-configured with sensible defaults!

### Step 3: Review OTP Rate Limiters

**Location**: `src/middleware/otpRateLimiter.js`

Contains strict rate limiters:
- **OTP Send**: 3 attempts/hour per IP (prevents email flooding)
- **OTP Verify**: 5 attempts/15 min per IP (prevents code guessing)

---

## 🚀 Deployment

### For Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start in development mode
npm run dev
```

### For Production (Render.com)

1. **Update Render Configuration**
   ```yaml
   # In render.yaml
   services:
     - name: backend
       env: production
   ```

2. **Set Environment Variables in Render Dashboard**
   - Go to your service settings
   - Add all variables from `.env`
   - Set `NODE_ENV=production`

3. **Deploy**
   ```bash
   git push origin main
   ```

### For Other Cloud Providers

#### AWS EC2
```bash
# 1. SSH into instance
ssh -i key.pem ec2-user@your-instance

# 2. Clone and setup
git clone your-repo.git
cd your-repo
npm install

# 3. Start with PM2
npm install -g pm2
pm2 start src/index.js --name "backend"
pm2 save
```

#### Heroku
```bash
# 1. Login to Heroku
heroku login

# 2. Create app
heroku create your-app-name

# 3. Set config vars
heroku config:set NODE_ENV=production
heroku config:set CORS_ORIGIN=https://your-domain.com

# 4. Deploy
git push heroku main
```

#### Google Cloud Run
```bash
# 1. Build Docker image
docker build -t gcr.io/your-project/backend .

# 2. Push to registry
docker push gcr.io/your-project/backend

# 3. Deploy
gcloud run deploy backend \
  --image gcr.io/your-project/backend \
  --platform managed \
  --region us-central1 \
  --set-env-vars NODE_ENV=production
```

---

## ✅ Verification Checklist

After deployment, verify everything works:

### Local Testing

```bash
# 1. Start server
npm run dev

# 2. Test health endpoint
curl http://localhost:5000/health

# 3. Test security headers
curl -I http://localhost:5000/health | grep -E "Strict|X-Frame|Content-Security"

# 4. Test rate limiting (should fail after 3rd attempt)
for i in {1..5}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:5000/api/otp/send \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}' \
    -w "Status: %{http_code}\n\n"
done
```

### Production Testing

```bash
# Replace https://your-domain.com with your actual domain

# 1. Check security headers
curl -I https://your-domain.com/health | grep -E "Strict|X-Frame|Content-Security"

# 2. Test OTP rate limiting
curl -X POST https://your-domain.com/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 3. Check response includes rate limit headers
curl -I https://your-domain.com/api/users | grep RateLimit
```

---

## 📊 Security Protections Summary

### What You're Now Protected From:

| Attack Type | Protection | Limit |
|------------|-----------|-------|
| **DDoS/DoS** | Global rate limiter | 100 req/15 min |
| **Brute Force (Login)** | Auth rate limiter | 5 attempts/hour |
| **OTP Guessing** | OTP verify limiter | 5 attempts/15 min |
| **Email Flooding** | OTP send limiter | 3 attempts/hour |
| **XSS** | CSP headers | Inline scripts blocked |
| **Clickjacking** | X-Frame-Options | Frame embedding blocked |
| **NoSQL Injection** | Sanitization | `$` characters removed |
| **MIME Sniffing** | X-Content-Type-Options | Type respected |
| **Large Payloads** | Size limits | 10KB max |
| **Slowloris** | Timeout | 30 second max |

---

## 🔧 Troubleshooting

### Issue: "Cannot find module 'helmet'"

```bash
# Solution: Install dependencies
npm install
```

### Issue: Rate limiting not working

**Check:**
1. Is `trust proxy` set correctly?
   ```javascript
   app.set('trust proxy', 1); // ✅ Already set
   ```

2. Are you behind a reverse proxy?
   - Render, AWS, etc. need `X-Forwarded-For` headers
   - Most services handle this automatically

3. Test with correct IP:
   ```bash
   curl -H "X-Forwarded-For: 192.168.1.1" http://localhost:5000/health
   ```

### Issue: CORS errors after security update

**Solution:**
Update `CORS_ORIGIN` in `.env`:
```bash
# For development
CORS_ORIGIN=http://localhost:3000

# For production
CORS_ORIGIN=https://yourdomain.com
```

Restart server and test:
```bash
curl -H "Origin: https://yourdomain.com" http://localhost:5000/api/users
```

### Issue: Getting 413 (Payload Too Large) errors

**Cause**: Request body exceeds 10KB limit

**Solutions:**
1. **Reduce payload size** - Split large requests
2. **Increase limit** (not recommended):
   ```javascript
   // In securityMiddleware.js
   app.use(express.json({ limit: '20kb' })); // Changed to 20KB
   ```

### Issue: "Too many requests" errors when testing

**This is expected!** The rate limiters are working.

**To test without hitting limits:**
1. Wait for the window to reset (15 min or 1 hour)
2. Use different IPs/VPNs
3. Temporarily adjust limits in development:
   ```javascript
   // In securityMiddleware.js for development
   const globalLimiter = process.env.NODE_ENV === 'production' 
     ? rateLimit({ max: 100 })
     : rateLimit({ max: 1000 }); // Higher limit in dev
   ```

---

## 📈 Monitoring

### View Rate Limit Activity

```bash
# Watch for 429 (rate limit) responses
tail -f /var/log/app.log | grep 429

# Or with grep for specific IPs
tail -f /var/log/app.log | grep -E "429|Rate"
```

### Alert Setup (Example with Datadog)

```javascript
// src/app.js - Add monitoring
app.use((req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode === 429) {
      // Send to monitoring service
      console.error(`Rate limited: ${req.ip} - ${req.path}`);
      // datadog.increment('api.rate_limited', 1);
    }
  });
  next();
});
```

---

## 🔄 Updates & Maintenance

### Check for Security Updates

```bash
# See security vulnerabilities
npm audit

# Fix automatically (be careful)
npm audit fix

# See what changed
npm outdated
```

### Update Packages

```bash
# Update all packages
npm update

# Or update specific security packages
npm update helmet express-rate-limit express-mongo-sanitize hpp
```

### Version Lock (Recommended)

In `package.json`, use exact versions:
```json
{
  "dependencies": {
    "helmet": "7.1.0",
    "express-rate-limit": "8.3.1"
  }
}
```

---

## 📚 Additional Resources

- [SECURITY.md](./SECURITY.md) - Detailed security documentation
- [Helmet Docs](https://helmetjs.github.io/)
- [Express Rate Limit Docs](https://github.com/nfriedly/express-rate-limit)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

## ❓ Questions or Issues?

1. Check the [SECURITY.md](./SECURITY.md) file for detailed explanations
2. Review the middleware files:
   - `src/middleware/securityMiddleware.js`
   - `src/middleware/otpRateLimiter.js`
3. Check logs for error messages
4. Run `npm audit` to identify issues

---

**Last Updated**: March 20, 2026
**Status**: ✅ Ready for Production

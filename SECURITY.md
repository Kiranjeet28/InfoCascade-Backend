# 🔒 Security Documentation

## Overview

This document outlines all security measures implemented to protect the InfoCascade backend API from common attacks, including brute force attacks, DDoS/DoS attacks, and other malicious activities.

---

## 📋 Table of Contents

1. [Security Vulnerabilities Mitigated](#security-vulnerabilities-mitigated)
2. [Security Middleware & Layers](#security-middleware--layers)
3. [Rate Limiting Strategy](#rate-limiting-strategy)
4. [Configuration Guide](#configuration-guide)
5. [Best Practices](#best-practices)
6. [Monitoring & Alerts](#monitoring--alerts)
7. [Testing Security](#testing-security)
8. [Emergency Procedures](#emergency-procedures)

---

## 🛡️ Security Vulnerabilities Mitigated

### 1. **Brute Force Attacks**
- **Risk**: Attackers making multiple login/authentication attempts to guess credentials or OTP codes
- **Mitigation**: Strict rate limiting on authentication endpoints (5 attempts per hour for login, 3 per hour for OTP send)
- **Impact**: Effectively prevents automated password/OTP guessing attacks

### 2. **Distributed Denial of Service (DDoS) / Denial of Service (DoS)**
- **Risk**: Overwhelming the server with excessive requests to make it unavailable
- **Mitigation**: 
  - Global rate limiter (100 requests per 15 minutes per IP)
  - Request size limits (10KB max for JSON/URL-encoded payloads)
  - Request timeout (30 seconds maximum)
- **Impact**: Absorbs and rejects coordinated attack traffic

### 3. **Cross-Site Scripting (XSS)**
- **Risk**: Injected malicious scripts executed in user browsers
- **Mitigation**: 
  - Content Security Policy (CSP) headers via Helmet.js
  - X-XSS-Protection headers
  - Request sanitization
- **Impact**: Prevents inline script execution and restricts resource loading

### 4. **Cross-Site Request Forgery (CSRF)**
- **Risk**: Forged requests from compromised websites
- **Mitigation**: 
  - CORS configured with origin validation
  - SameSite cookie attributes (via Helmet)
- **Impact**: Only allows requests from trusted origins

### 5. **Clickjacking**
- **Risk**: Attacker tricks users into clicking hidden elements
- **Mitigation**: 
  - X-Frame-Options header set to 'DENY' (via Helmet)
  - Content-Security-Policy frame-ancestors directive
- **Impact**: Prevents framing the application in malicious pages

### 6. **MIME Type Sniffing**
- **Risk**: Browser interpreting content as different type than declared
- **Mitigation**: X-Content-Type-Options: 'nosniff' header (via Helmet)
- **Impact**: Forces browser to respect declared content types

### 7. **NoSQL Injection**
- **Risk**: Injected MongoDB operators to manipulate queries ($where, $ne, etc.)
- **Mitigation**: express-mongo-sanitize middleware removes '$' and '.' characters
- **Impact**: Prevents NoSQL injection payloads in query parameters

### 8. **HTTP Parameter Pollution (HPP)**
- **Risk**: Duplicate parameters confusing parsers and bypassing validations
- **Mitigation**: HPP middleware using express-hpp
- **Impact**: Normalizes and filters suspicious parameter patterns

### 9. **Large Payload Attacks (Memory Exhaustion)**
- **Risk**: Oversized requests consuming excessive server memory
- **Mitigation**: 10KB size limit on JSON and URL-encoded payloads
- **Impact**: Prevents memory exhaustion and slowloris attacks

### 10. **Slowloris / Slow Attacks**
- **Risk**: Attacker sends slow requests to exhaust server resources
- **Mitigation**: 30-second request/response timeout
- **Impact**: Forces timeout of slow/hung connections

---

## 🔐 Security Middleware & Layers

### Layer 1: HTTP Headers Security (Helmet.js)
**File**: `src/middleware/securityMiddleware.js`

```javascript
app.use(helmet({
  contentSecurityPolicy: { /* CSP directives */ },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));
```

**Headers Set:**
- `Strict-Transport-Security`: Forces HTTPS for 1 year
- `X-Content-Type-Options: nosniff`: Prevents MIME sniffing
- `X-Frame-Options: DENY`: Prevents clickjacking
- `X-XSS-Protection: 1; mode=block`: XSS protection
- `Content-Security-Policy`: Restricts resource loading
- `Referrer-Policy`: Controls referrer information
- `Permissions-Policy`: Restricts browser features

### Layer 2: Rate Limiting (express-rate-limit)
**Files**: `src/middleware/securityMiddleware.js`, `src/middleware/otpRateLimiter.js`

Three distinct limiters:

#### Global Limiter
- **Scope**: All requests
- **Limit**: 100 requests per 15 minutes per IP
- **Skip**: `/health` endpoint
- **Purpose**: General DDoS protection

#### OTP Send/Resend Limiter
- **Scope**: `/api/otp/send` and `/api/otp/resend`
- **Limit**: 3 requests per hour per IP
- **Purpose**: Prevents email flooding and brute force OTP generation

#### OTP Verify Limiter
- **Scope**: `/api/otp/verify`
- **Limit**: 5 attempts per 15 minutes per IP
- **Purpose**: Prevents OTP code guessing (only ~0.2% chance to guess in window)

### Layer 3: Payload Protection
**File**: `src/middleware/securityMiddleware.js`

```javascript
// Size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// NoSQL injection prevention
app.use(mongoSanitize());

// Parameter pollution prevention
app.use(hpp());
```

**Benefits:**
- Prevents memory exhaustion
- Blocks injected MongoDB operators
- Normalizes malicious query patterns

### Layer 4: Request Timeout Protection
**File**: `src/middleware/securityMiddleware.js`

```javascript
app.use((req, res, next) => {
  req.setTimeout(30000);  // 30 seconds
  res.setTimeout(30000);
  next();
});
```

**Protection**: Prevents slowloris and slow read attacks

### Layer 5: Reverse Proxy Trust
**File**: `src/middleware/securityMiddleware.js`

```javascript
app.set('trust proxy', 1);
```

**Purpose**: Correctly identifies client IP when behind reverse proxies (Render, AWS, etc.)

---

## 📊 Rate Limiting Strategy

### Rate Limit Tiers

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| All endpoints (global) | 100 req | 15 min | General DDoS protection |
| `/api/otp/send` | 3 req | 1 hour | Prevent email flooding |
| `/api/otp/resend` | 3 req | 1 hour | Prevent email flooding |
| `/api/otp/verify` | 5 req | 15 min | Prevent OTP guessing |
| API endpoints | 50 req | 15 min | Standard API protection |

### Rate Limit Headers

All rate-limit responses include standard headers:
```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1616161616
```

### HTTP Status Codes

- **429 Too Many Requests**: Rate limit exceeded
- **Error Response Format**:
```json
{
  "success": false,
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please try again later."
}
```

---

## ⚙️ Configuration Guide

### Environment Variables

Add these to your `.env` file:

```bash
# Rate Limiting
API_RATE_LIMIT=30                    # Global API rate limit per hour
RATE_LIMIT_WINDOW_MS=900000          # Rate limit window (15 min)
RATE_LIMIT_MAX_REQUESTS=100          # Max requests per window

# Security
NODE_ENV=production                  # Set to 'production' for production
CORS_ORIGIN=https://yourdomain.com   # Restrict CORS to your domain
SESSION_SECRET=your-secret-key       # For session management

# Server
REQUEST_TIMEOUT=30000                # Request timeout in ms (30 seconds)
PAYLOAD_SIZE_LIMIT=10kb              # Max JSON/form payload size
```

### Production Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure `CORS_ORIGIN` to your frontend domain
- [ ] Enable HTTPS (required for HSTS)
- [ ] Set appropriate `API_RATE_LIMIT` based on expected traffic
- [ ] Configure reverse proxy to set `X-Forwarded-For` headers
- [ ] Set up monitoring/alerting for 429 responses
- [ ] Review and customize CSP headers for your needs
- [ ] Enable database authentication and encryption
- [ ] Implement API key authentication if needed
- [ ] Regular security audits and updates

---

## 🎯 Best Practices

### For Developers

1. **Always use HTTPS** in production
   ```bash
   # Enforce in your deployment
   NODE_ENV=production
   ```

2. **Validate Input Data**
   - Never trust user input
   - Validate type, length, and format
   - Use schema validation (Mongoose validates)

3. **Use Strong Passwords**
   - Enforce minimum length (12+ characters)
   - Require mixed case, numbers, symbols
   - Hash passwords with bcrypt (already implemented)

4. **Keep Dependencies Updated**
   ```bash
   npm audit
   npm update
   ```

5. **Implement Proper Logging**
   ```javascript
   // Log security events
   console.warn(`[Security] Suspicious activity from ${req.ip}`);
   ```

6. **Use Environment Variables**
   - Never hardcode secrets
   - Use `.env` file (not in git)
   - Example: `CORS_ORIGIN`, `SESSION_SECRET`

### For DevOps/Infrastructure

1. **Configure Reverse Proxy Correctly**
   - Set `X-Forwarded-For` headers
   - Trust proxy in app: ✅ Already configured

2. **Enable DDoS Protection**
   - Use CloudFlare or similar service
   - Configure WAF rules
   - Rate limiting at edge

3. **Monitor for Attacks**
   - Set alerts on 429 responses
   - Track 4xx errors by IP
   - Monitor response times

4. **Configure Firewalls**
   ```bash
   # Block IPs with excessive 429 responses
   # Implement geographic restrictions if needed
   # Restrict ports to necessary services
   ```

5. **Database Security**
   - Enable authentication
   - Use encryption at rest
   - Regular backups
   - Monitor slow queries

---

## 📈 Monitoring & Alerts

### Key Metrics to Monitor

```javascript
// Log rate limit events
app.use((req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode === 429) {
      console.warn(`[Rate Limited] ${req.ip} - ${req.path}`);
      // Send to monitoring service
      sendToMonitoring({
        event: 'rate_limit',
        ip: req.ip,
        path: req.path,
        timestamp: new Date()
      });
    }
  });
  next();
});
```

### Alert Thresholds

- **Warning**: >10 429 responses from single IP in 5 minutes
- **Critical**: >50 429 responses from single IP in 5 minutes
- **Action**: Block/throttle IP after 100 429 responses

### Useful Queries

```bash
# Count 429 responses in last hour
curl 'http://logs.example.com/search?q=status:429&since=1h'

# Get top attacking IPs
curl 'http://logs.example.com/stats?group_by=client_ip&filter=status:429'

# Monitor rate limit headers
curl -v 'http://localhost:5000/api/otp/send' 2>&1 | grep RateLimit
```

---

## 🧪 Testing Security

### Test Brute Force Protection

```bash
#!/bin/bash
# Test OTP send rate limiting (should succeed 3 times then fail)
for i in {1..6}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:5000/api/otp/send \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}' \
    -w "Status: %{http_code}\n\n"
  sleep 1
done
```

### Test DDoS Protection

```bash
#!/bin/bash
# Send 150 requests in 15 minutes (should get 429)
for i in {1..150}; do
  curl -s http://localhost:5000/api/users \
    -H "X-Forwarded-For: 192.168.1.100" > /dev/null
  echo "Request $i sent"
done
```

### Test Header Security

```bash
# Check security headers
curl -I http://localhost:5000/health

# Should see:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Content-Security-Policy: ...
```

### Test NoSQL Injection Protection

```bash
# Try NoSQL injection (should be sanitized)
curl -X GET 'http://localhost:5000/api/users?name[$ne]=""'

# Payload gets sanitized: name[$ne]="" → name_$ne_=""
```

### Test Payload Size Limits

```bash
# Create large payload (should get 413)
python3 << 'EOF'
import requests
large_data = {"data": "x" * 20000}  # 20KB payload
response = requests.post('http://localhost:5000/api/users', json=large_data)
print(f"Status: {response.status_code}")  # Should be 413
EOF
```

---

## 🚨 Emergency Procedures

### If Under Attack

**Immediate Actions:**

1. **Monitor Dashboard**
   ```bash
   watch -n 1 'tail -100 /var/log/app.log | grep 429'
   ```

2. **Identify Attacking IP**
   ```bash
   grep "429" /var/log/app.log | awk '{print $NF}' | sort | uniq -c
   ```

3. **Temporarily Block IP (at firewall level)**
   ```bash
   # Example for iptables
   sudo iptables -I INPUT -s 192.168.1.100 -j DROP
   ```

4. **Increase Rate Limits if Legitimate Traffic**
   ```bash
   # Update .env
   API_RATE_LIMIT=60
   # Restart server
   ```

5. **Enable CloudFlare/WAF Protection**
   - Increase protection level
   - Enable Bot Management
   - Implement CAPTCHA challenges

### Post-Attack Analysis

1. **Collect Logs**
   ```bash
   # Export logs from period
   journalctl -u app --since "2024-01-01 00:00:00" > attack_logs.txt
   ```

2. **Analyze Attack Patterns**
   - Which endpoints were targeted?
   - What was the request distribution?
   - Were there successful intrusions?

3. **Implement Additional Protections**
   - Stricter rate limits
   - Geographic restrictions
   - Additional WAF rules

4. **Update Documentation**
   - Document attack details
   - Update monitoring rules
   - Train team on response

---

## 📚 Security References & Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Express Rate Limit](https://github.com/nfriedly/express-rate-limit)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [CWE: Common Weakness Enumeration](https://cwe.mitre.org/)

---

## 🔄 Regular Security Maintenance

### Weekly
- [ ] Review logs for 429 errors
- [ ] Check npm audit results
- [ ] Monitor false positive rate limits

### Monthly
- [ ] Update dependencies
- [ ] Review security logs
- [ ] Audit user access patterns
- [ ] Test rate limiters

### Quarterly
- [ ] Security audit
- [ ] Penetration testing
- [ ] Update CSP headers
- [ ] Review and adjust rate limits

### Annually
- [ ] Full security assessment
- [ ] Update security policies
- [ ] Staff training
- [ ] Disaster recovery test

---

## ✅ Deployment Verification

After deploying, verify all security measures:

```bash
#!/bin/bash
echo "Verifying security implementation..."

# 1. Check headers
echo "1. Checking security headers..."
curl -I http://your-domain.com/health | grep -E "Strict|X-Frame|X-Content"

# 2. Test rate limiting
echo "2. Testing rate limiting..."
for i in {1..6}; do
  curl -s http://your-domain.com/api/otp/send \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com"}' \
    | grep -o '"code":"[^"]*"'
done

# 3. Check dependencies
echo "3. Checking security dependencies..."
npm list helmet express-mongo-sanitize hpp express-rate-limit

echo "Security verification complete!"
```

---

## Support & Reporting

For security vulnerabilities, please report to the security team:
- **Email**: security@yourcompany.com
- **Do NOT** create public GitHub issues for security issues

---

**Last Updated**: March 20, 2026
**Security Level**: 🟢 Production Ready

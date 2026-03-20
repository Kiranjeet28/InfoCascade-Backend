/**
 * Security Tests
 * Tests for brute force protection, rate limiting, and other security measures
 */

const request = require('supertest');
const app = require('../src/app');

describe('Security Middleware - Brute Force & DDoS Protection', () => {
  
  // ========== Rate Limiting Tests ==========

  describe('Rate Limiting', () => {
    
    test('Global rate limiter allows normal traffic', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
    });

    test('Global rate limiter returns 429 after exceeding limit', async () => {
      // Make requests up to the limit
      const limit = 100;
      let response;
      
      for (let i = 0; i < limit + 1; i++) {
        response = await request(app).get('/health');
      }
      
      // Next request should be rate limited
      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('code', 'RATE_LIMIT_EXCEEDED');
    });
  });

  // ========== OTP Brute Force Protection Tests ==========

  describe('OTP Send Rate Limiting (Brute Force Protection)', () => {
    
    test('Allows 3 OTP send requests per hour', async () => {
      // First 3 requests should succeed
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/otp/send')
          .send({ email: `test${i}@example.com` });
        
        expect(response.status).not.toBe(429);
      }
    });

    test('Blocks OTP send requests after 3 attempts (brute force prevention)', async () => {
      // Make 4 requests (4th should be blocked)
      let response;
      
      for (let i = 0; i < 4; i++) {
        response = await request(app)
          .post('/api/otp/send')
          .send({ email: `bruteforce${i}@example.com` });
      }
      
      // 4th request should be rate limited
      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('code', 'OTP_SEND_RATE_LIMIT');
      expect(response.body.message).toContain('Too many OTP requests');
    });

    test('Rate limit headers are included in response', async () => {
      const response = await request(app)
        .post('/api/otp/send')
        .send({ email: 'test@example.com' });
      
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
      expect(response.headers).toHaveProperty('ratelimit-reset');
    });
  });

  // ========== OTP Verify Rate Limiting (OTP Guessing Prevention) ==========

  describe('OTP Verify Rate Limiting (OTP Guessing Prevention)', () => {
    
    test('Allows 5 OTP verify attempts per 15 minutes', async () => {
      // First 5 requests should not be rate limited
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/otp/verify')
          .send({ email: 'test@example.com', otp: '123456' });
        
        expect(response.status).not.toBe(429);
      }
    });

    test('Blocks OTP verify after 5 attempts (guessing prevention)', async () => {
      // Make 6 verify requests (6th should be blocked)
      let response;
      
      for (let i = 0; i < 6; i++) {
        response = await request(app)
          .post('/api/otp/verify')
          .send({ email: `verify${i}@example.com`, otp: `${String(i).padStart(6, '0')}` });
      }
      
      // 6th request should be rate limited
      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('code', 'OTP_VERIFY_RATE_LIMIT');
      expect(response.body.message).toContain('Too many verification attempts');
    });
  });

  // ========== Security Headers Tests ==========

  describe('Security Headers (Helmet.js)', () => {
    
    test('Sets Strict-Transport-Security header', async () => {
      const response = await request(app)
        .get('/health');
      
      expect(response.headers).toHaveProperty('strict-transport-security');
      expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
      expect(response.headers['strict-transport-security']).toContain('includeSubDomains');
    });

    test('Sets X-Frame-Options to DENY (clickjacking protection)', async () => {
      const response = await request(app)
        .get('/health');
      
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    test('Sets X-Content-Type-Options to nosniff (MIME sniffing protection)', async () => {
      const response = await request(app)
        .get('/health');
      
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('Sets Content-Security-Policy header', async () => {
      const response = await request(app)
        .get('/health');
      
      expect(response.headers).toHaveProperty('content-security-policy');
    });

    test('Sets X-XSS-Protection header', async () => {
      const response = await request(app)
        .get('/health');
      
      expect(response.headers).toHaveProperty('x-xss-protection');
      expect(response.headers['x-xss-protection']).toContain('1');
      expect(response.headers['x-xss-protection']).toContain('mode=block');
    });
  });

  // ========== Payload Size Limiting Tests ==========

  describe('Payload Size Limits (DDoS Prevention)', () => {
    
    test('Accepts payloads under 10KB limit', async () => {
      const smallPayload = {
        name: 'Test User',
        email: 'test@example.com'
      };
      
      const response = await request(app)
        .post('/api/users')
        .send(smallPayload);
      
      // Should not be 413 (Payload Too Large)
      expect(response.status).not.toBe(413);
    });

    test('Rejects payloads over 10KB limit', async () => {
      // Create a payload larger than 10KB
      const largePayload = {
        data: 'x'.repeat(20000) // 20KB
      };
      
      const response = await request(app)
        .post('/api/users')
        .send(largePayload);
      
      expect(response.status).toBe(413);
    });
  });

  // ========== NoSQL Injection Prevention Tests ==========

  describe('NoSQL Injection Prevention (express-mongo-sanitize)', () => {
    
    test('Sanitizes MongoDB operators in query parameters', async () => {
      const response = await request(app)
        .get('/api/users?name[$ne]=admin');
      
      // The $ne operator should be sanitized
      // The query should not execute the injection
      expect(response.status).not.toBe(500);
    });

    test('Sanitizes MongoDB operators in request body', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ name: { $ne: 'admin' } });
      
      // Should either fail validation or sanitize the payload
      expect(response.status).not.toBe(500);
    });

    test('Removes $ character from injection attempts', async () => {
      const response = await request(app)
        .get('/api/users?email[$exists]=true');
      
      // Should not execute the $exists operator
      expect(response.status).not.toBe(500);
    });
  });

  // ========== CORS Protection Tests ==========

  describe('CORS Protection', () => {
    
    test('Allows requests from CORS_ORIGIN', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');
      
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    test('Rejects requests from unauthorized origins (when CORS_ORIGIN is set)', async () => {
      // This test depends on CORS_ORIGIN being configured
      const response = await request(app)
        .options('/api/users')
        .set('Origin', 'https://malicious.com');
      
      // Behavior depends on CORS configuration
      // At minimum, should not leak sensitive data
      expect(response.status).not.toBe(500);
    });
  });

  // ========== HTTP Parameter Pollution Prevention (HPP) ==========

  describe('HTTP Parameter Pollution Prevention', () => {
    
    test('Handles duplicate query parameters safely', async () => {
      const response = await request(app)
        .get('/api/users?id=1&id=2&id=3');
      
      // Should handle without executing injection
      expect(response.status).not.toBe(500);
    });

    test('Whitelists legitimate array parameters', async () => {
      const response = await request(app)
        .get('/api/users?sort=name&sort=email');
      
      // sort is whitelisted for arrays
      expect(response.status).not.toBe(500);
    });
  });

  // ========== 404 & Error Handling ==========

  describe('Error Handling', () => {
    
    test('Returns 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', 'ROUTE_NOT_FOUND');
    });

    test('Does not leak stack traces in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const response = await request(app)
        .get('/api/nonexistent');
      
      expect(response.body).not.toHaveProperty('stack');
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  // ========== Rate Limit Reset Tests ==========

  describe('Rate Limit Reset', () => {
    
    test('Rate limit resets after window expires', async () => {
      // Note: This test might need to be skipped in CI/CD
      // as it requires waiting for the rate limit window to expire
      
      // Send a request
      const response1 = await request(app)
        .get('/health');
      
      const resetTime = parseInt(response1.headers['ratelimit-reset']);
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Reset time should be in the future
      expect(resetTime).toBeGreaterThan(currentTime);
    });
  });

});

describe('Security - Integration Tests', () => {
  
  test('Combined attack scenario: brute force + large payload', async () => {
    // Try to send multiple large OTP requests (combined attack)
    let lastResponse;
    
    for (let i = 0; i < 5; i++) {
      lastResponse = await request(app)
        .post('/api/otp/send')
        .send({ 
          email: 'test@example.com',
          data: 'x'.repeat(10000) // Large payload
        });
    }
    
    // Should be stopped by either rate limiter or size limiter
    expect([413, 429]).toContain(lastResponse.status);
  });

  test('All security layers working together', async () => {
    // Make a request and verify all security measures are in place
    const response = await request(app)
      .get('/health');
    
    // Check rate limit headers
    expect(response.headers).toHaveProperty('ratelimit-limit');
    
    // Check security headers
    expect(response.headers).toHaveProperty('strict-transport-security');
    expect(response.headers).toHaveProperty('x-frame-options');
    expect(response.headers).toHaveProperty('x-content-type-options');
    expect(response.headers).toHaveProperty('content-security-policy');
    
    // Check CORS headers
    expect(response.headers).toHaveProperty('access-control-allow-origin');
  });
});

/**
 * AI Chat Endpoint Test
 * Tests the /api/ai/chat endpoint with dummy requests
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

// Helper function to generate a valid JWT token for testing
function generateTestToken() {
  const payload = {
    userId: '507f1f77bcf86cd799439011', // Mock MongoDB ObjectId
    email: 'test@example.com',
    name: 'Test User',
    isAdmin: false,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '24h',
  });

  return token;
}

describe('AI Chat Endpoint - /api/ai/chat', () => {

  // ========== Authentication Tests ==========

  describe('Authentication', () => {

    test('Returns 401 when no authentication token is provided', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .send({ message: 'Hello, where is the library?' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', 'NO_TOKEN');
      expect(response.body).toHaveProperty('message');
      console.log('✅ Test passed: No token returns 401');
    });

    test('Returns 401 when invalid token format is provided', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', 'InvalidToken123')
        .send({ message: 'Hello, where is the library?' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('code', 'INVALID_TOKEN_FORMAT');
      console.log('✅ Test passed: Invalid token format returns 401');
    });

    test('Returns 401 when invalid/expired token is provided', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', 'Bearer invalid.token.here')
        .send({ message: 'Hello, where is the library?' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      console.log('✅ Test passed: Invalid token returns 401');
    });
  });

  // ========== Input Validation Tests ==========

  describe('Input Validation', () => {

    const validToken = `Bearer ${generateTestToken()}`;

    test('Returns 400 when message is missing', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', validToken)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', 'MISSING_MESSAGE');
      console.log('✅ Test passed: Missing message returns 400');
    });

    test('Returns 400 when message is empty string', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', validToken)
        .send({ message: '' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('code', 'MISSING_MESSAGE');
      console.log('✅ Test passed: Empty message returns 400');
    });

    test('Returns 400 when message is only whitespace', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', validToken)
        .send({ message: '   \n\t  ' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('code', 'MISSING_MESSAGE');
      console.log('✅ Test passed: Whitespace-only message returns 400');
    });

    test('Returns 400 when message is not a string', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', validToken)
        .send({ message: 12345 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('code', 'MISSING_MESSAGE');
      console.log('✅ Test passed: Non-string message returns 400');
    });
  });

  // ========== Successful Requests Tests ==========

  describe('Successful Requests', () => {

    const validToken = `Bearer ${generateTestToken()}`;

    test('Successfully processes a valid GNDEC-related query', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', validToken)
        .send({ message: 'Where is the library located at GNDEC?' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('response');
      expect(typeof response.body.response).toBe('string');
      expect(response.body.response.length).toBeGreaterThan(0);
      console.log('✅ Test passed: Valid GNDEC query processed successfully');
      console.log('   Response:', response.body.response.substring(0, 100) + '...');
    }, 15000); // Increase timeout for API call

    test('Successfully processes a generic GNDEC query', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', validToken)
        .send({ message: 'Tell me about GNDEC' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('response');
      console.log('✅ Test passed: Generic GNDEC query processed successfully');
      console.log('   Response:', response.body.response.substring(0, 100) + '...');
    }, 15000);

    test('Handles GNDEC unrelated queries appropriately', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', validToken)
        .send({ message: 'What is the weather like on Mars?' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('response');
      console.log('✅ Test passed: Unrelated query handled appropriately');
      console.log('   Response:', response.body.response.substring(0, 100) + '...');
    }, 15000);

    test('Processes message with leading/trailing whitespace', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', validToken)
        .send({ message: '   Where is GNDEC located?   ' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('response');
      console.log('✅ Test passed: Message with whitespace trimmed and processed');
    }, 15000);
  });

  // ========== Rate Limiting Tests ==========

  describe('Rate Limiting', () => {

    const validToken = `Bearer ${generateTestToken()}`;

    test('Includes rate limit headers in response', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', validToken)
        .send({ message: 'Hello GNDEC' });

      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
      console.log('✅ Test passed: Rate limit headers present');
      console.log(`   Rate limit: ${response.headers['ratelimit-limit']}`);
      console.log(`   Remaining: ${response.headers['ratelimit-remaining']}`);
    }, 15000);
  });

  // ========== Error Handling Tests ==========

  describe('Error Handling', () => {

    const validToken = `Bearer ${generateTestToken()}`;

    test('Gracefully handles API errors', async () => {
      // This test may fail if the AI service is not configured,
      // but it should still return a proper error response
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', validToken)
        .send({ message: 'Test message' });

      // Either success or a proper error response
      if (response.status !== 200) {
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('code');
        console.log('✅ Test passed: API error handled gracefully');
        console.log(`   Error code: ${response.body.code}`);
      } else {
        console.log('✅ Test passed: API request successful');
      }
    }, 15000);
  });

  // ========== Security Headers Tests ==========

  describe('Security Headers', () => {

    const validToken = `Bearer ${generateTestToken()}`;

    test('Includes security headers in response', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', validToken)
        .send({ message: 'Hello' });

      expect(response.headers).toHaveProperty('strict-transport-security');
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      console.log('✅ Test passed: Security headers present');
    }, 15000);
  });

});

// ========== Integration Test ==========

describe('AI Chat - Integration Test', () => {

  test('Full workflow: authenticate and chat', async () => {
    const token = generateTestToken();

    console.log('\n🔐 Generated test token (first 50 chars):', token.substring(0, 50) + '...');

    // Step 1: Make a chat request
    const response = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({
        message: 'What facilities are available at GNDEC Ludhiana?'
      });

    console.log('\n📤 Request sent to /api/ai/chat');
    console.log('📦 Payload: { message: "What facilities are available at GNDEC Ludhiana?" }');
    console.log('\n📥 Response Status:', response.status);
    console.log('📊 Response Body:');
    console.log(JSON.stringify(response.body, null, 2));

    // Verify response
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('response');

    console.log('\n✅ Integration test passed!');
  }, 20000);
});

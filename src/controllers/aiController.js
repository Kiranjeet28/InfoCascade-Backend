const { chat } = require('../services/geminiService');
const { filterResponse } = require('../utils/responseFilter');

const fail = (res, status, code, message, extra = {}) =>
  res.status(status).json({ success: false, code, message, ...extra });

const success = (res, status, data = {}) =>
  res.status(status).json({ success: true, ...data });

/**
 * AI Chat Endpoint
 * Handles user queries restricted to GNDEC Ludhiana
 * Uses Gemini 2.5 Flash with backend-optimized JSON responses
 *
 * Request:
 * POST /api/ai/chat
 * {
 *   "message": "Where is the library?"
 * }
 *
 * Response (Success):
 * {
 *   "success": true,
 *   "response": "The library is located in the main building.",
 *   "isGNDECRelated": true,
 *   "status": "success"
 * }
 *
 * Response (Unrelated Query):
 * {
 *   "success": true,
 *   "response": "I can only assist with GNDEC Ludhiana related information.",
 *   "isGNDECRelated": false,
 *   "status": "error"
 * }
 */
async function chatWithAI(req, res) {
  const { message } = req.body;

  // Input validation
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return fail(res, 400, 'MISSING_MESSAGE', 'Valid message is required');
  }

  try {
    // Call Gemini 2.5 Flash with system instruction
    // The service now returns structured JSON
    const rawResponse = await chat(message.trim());

    // Parse the JSON response from Gemini
    let aiResponse;
    try {
      aiResponse = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      return fail(res, 500, 'AI_PARSE_ERROR', 'Failed to parse AI response format');
    }

    // Extract data from the structured response
    const { status, data, reasoning } = aiResponse;

    // Handle error responses from AI
    if (status === 'error') {
      const filteredResponse = filterResponse(data?.response || 'I can only assist with GNDEC Ludhiana related information.');
      return success(res, 200, {
        response: filteredResponse,
        isGNDECRelated: false,
        status: 'error',
        reasoning: reasoning || 'Query is unrelated to GNDEC'
      });
    }

    // Filter and validate successful response
    const filteredResponse = filterResponse(data?.response || '');
    const isGNDECRelated = data?.isGNDECRelated ?? true;

    success(res, 200, {
      response: filteredResponse,
      isGNDECRelated: isGNDECRelated,
      status: status || 'success',
      reasoning: reasoning || 'Response provided'
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    fail(res, 500, 'AI_ERROR', 'Failed to process AI request', {
      errorDetails: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

module.exports = { chatWithAI };

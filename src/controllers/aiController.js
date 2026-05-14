const { chat } = require('../services/geminiService');
const systemPrompt = require('../config/systemPrompt');
const { filterResponse } = require('../utils/responseFilter');

const fail = (res, status, code, message, extra = {}) =>
  res.status(status).json({ success: false, code, message, ...extra });

const success = (res, status, data = {}) =>
  res.status(status).json({ success: true, ...data });

/**
 * AI Chat Endpoint
 * Handles user queries restricted to GNDEC Ludhiana
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
 *   "response": "The library is located in the main building."
 * }
 *
 * Response (Unrelated Query):
 * {
 *   "success": true,
 *   "response": "I can only assist with GNDEC Ludhiana related information."
 * }
 */
async function chatWithAI(req, res) {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return fail(res, 400, 'MISSING_MESSAGE', 'Valid message is required');
  }

  try {
    const rawResponse = await chat(message.trim(), systemPrompt);
    const filteredResponse = filterResponse(rawResponse);
    success(res, 200, { response: filteredResponse });
  } catch (error) {
    console.error('AI Chat Error:', error);
    fail(res, 500, 'AI_ERROR', 'Failed to process AI request');
  }
}

module.exports = { chatWithAI };
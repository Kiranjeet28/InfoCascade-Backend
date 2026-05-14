/**
 * AI Assistant Routes
 *
 * POST /api/ai/chat - Chat with GNDEC-restricted AI
 */

const express = require("express");
const router = express.Router();
const aiCtrl = require("../controllers/aiController");
const authMiddleware = require("../middleware/authMiddleware");
const { apiLimiter } = require("../middleware/securityMiddleware");

/**
 * Apply rate limiting to AI endpoints
 */
router.use(apiLimiter);

/**
 * Protected routes - require authentication
 */
router.post("/chat", authMiddleware, aiCtrl.chatWithAI);

module.exports = router;
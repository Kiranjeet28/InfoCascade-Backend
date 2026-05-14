const { chat } = require("../services/geminiService");
const { filterResponse } = require("../utils/responseFilter");

const fail = (res, status, code, message, extra = {}) =>
  res.status(status).json({
    success: false,
    code,
    message,
    ...extra,
  });

const success = (res, status, data = {}) =>
  res.status(status).json({
    success: true,
    ...data,
  });

// -----------------------------------
// Safe JSON Parse
// -----------------------------------
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// -----------------------------------
// AI Chat Controller
// -----------------------------------
async function chatWithAI(req, res) {
  try {
    const { message } = req.body;

    // Validate input
    if (!message || typeof message !== "string") {
      return fail(
        res,
        400,
        "INVALID_MESSAGE",
        "Valid message is required",
      );
    }

    console.log("📩 Incoming AI message:", message);

    // Call Gemini
    const rawResponse = await chat(message.trim());

    console.log("📦 RAW AI RESPONSE:");
    console.log(rawResponse);

    // Parse safely
    const aiResponse = safeJsonParse(rawResponse);

    // Invalid JSON
    if (!aiResponse) {
      console.error("❌ Failed to parse AI response");

      return success(res, 200, {
        response:
          "AI returned invalid response format.",
        isGNDECRelated: false,
        status: "error",
        reasoning: "Invalid JSON parsing",
      });
    }

    // Extract fields
    const {
      status = "success",
      data = {},
      reasoning = "",
    } = aiResponse;

    const filteredResponse = filterResponse(
      data.response ||
        "I can only assist with GNDEC Ludhiana related information.",
    );

    // Error response from AI
    if (status === "error") {
      return success(res, 200, {
        response: filteredResponse,
        isGNDECRelated: false,
        status: "error",
        reasoning:
          reasoning || "Unrelated or failed query",
      });
    }

    // Success response
    return success(res, 200, {
      response: filteredResponse,
      isGNDECRelated:
        data.isGNDECRelated ?? true,
      status: "success",
      reasoning:
        reasoning || "AI response generated",
    });

  } catch (error) {
    console.error("❌ AI CONTROLLER ERROR:", {
      message: error.message,
      stack: error.stack,
    });

    return fail(
      res,
      500,
      "AI_CONTROLLER_ERROR",
      "AI service temporarily unavailable.",
      {
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : undefined,
      },
    );
  }
}

module.exports = {
  chatWithAI,
};
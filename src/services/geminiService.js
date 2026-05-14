const { GoogleGenerativeAI } = require("@google/generative-ai");

let genAI = null;
let model = null;

const MODEL_NAME = "gemini-1.5-flash";

// -----------------------------
// Initialize Gemini
// -----------------------------
function initializeGemini() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    genAI = new GoogleGenerativeAI(apiKey);

    model = genAI.getGenerativeModel({
      model: MODEL_NAME,

      systemInstruction: `
You are an AI assistant for GNDEC Ludhiana only.

Rules:
- Answer ONLY GNDEC related questions
- Return ONLY valid JSON
- No markdown
- No extra explanation

JSON format:
{
  "status": "success" | "error",
  "data": {
    "response": "text",
    "isGNDECRelated": true
  },
  "reasoning": "short reason"
}
`,
    });

    console.log(`✅ Gemini initialized: ${MODEL_NAME}`);

  } catch (error) {
    console.error("❌ Gemini init failed:", error.message);
  }
}

initializeGemini();

// -----------------------------
// Timeout helper
// -----------------------------
function timeoutPromise(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error("Gemini request timeout"));
    }, ms);
  });
}

// -----------------------------
// Safe JSON parser
// -----------------------------
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// -----------------------------
// Chat function
// -----------------------------
async function chat(message) {
  try {
    if (!model) {
      throw new Error("Gemini model not initialized");
    }

    console.log("🤖 Gemini request started");

    // Timeout protection
    const result = await Promise.race([
      model.generateContent(message),
      timeoutPromise(20000), // 20 sec backend timeout
    ]);

    console.log("✅ Gemini response received");

    const responseText = result.response.text();

    if (!responseText) {
      throw new Error("Empty Gemini response");
    }

    // Remove markdown if Gemini returns ```json
    const cleaned = responseText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = safeJsonParse(cleaned);

    // If invalid JSON, wrap safely
    if (!parsed) {
      return JSON.stringify({
        status: "success",
        data: {
          response: cleaned,
          isGNDECRelated: true,
        },
        reasoning: "Wrapped non-JSON response",
      });
    }

    return JSON.stringify(parsed);

  } catch (error) {
    console.error("❌ Gemini Error:", error.message);

    // Timeout fallback
    if (error.message.includes("timeout")) {
      return JSON.stringify({
        status: "error",
        data: {
          response:
            "Server is waking up. Please try again in a few seconds.",
          isGNDECRelated: false,
        },
        reasoning: "Gemini timeout",
      });
    }

    // Rate limit
    if (error.status === 429) {
      return JSON.stringify({
        status: "error",
        data: {
          response:
            "AI service is busy right now. Please try again shortly.",
          isGNDECRelated: false,
        },
        reasoning: "Rate limit exceeded",
      });
    }

    // Generic fallback
    return JSON.stringify({
      status: "error",
      data: {
        response:
          "AI service temporarily unavailable.",
        isGNDECRelated: false,
      },
      reasoning: error.message,
    });
  }
}

module.exports = {
  chat,
  initializeGemini,
};
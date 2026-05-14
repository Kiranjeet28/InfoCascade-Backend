const { GoogleGenerativeAI } = require("@google/generative-ai");

let genAI = null;
let model = null;

const MODEL_NAME = "gemini-1.5-flash";

// -----------------------------------
// Initialize Gemini
// -----------------------------------
function initializeGemini() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    genAI = new GoogleGenerativeAI(apiKey);

    model = genAI.getGenerativeModel({
      model: MODEL_NAME,

      generationConfig: {
        temperature: 0.3,
        topP: 0.8,
        topK: 20,
        maxOutputTokens: 512,
      },

      systemInstruction: `
You are an AI assistant for GNDEC Ludhiana only.

Rules:
- Answer ONLY GNDEC Ludhiana related questions
- Keep responses concise and student-friendly
- Do NOT answer unrelated questions
- Respond in VALID JSON format only
- Do NOT use markdown formatting

JSON FORMAT:
{
  "status": "success" | "error",
  "data": {
    "response": "your response",
    "isGNDECRelated": true | false
  },
  "reasoning": "short explanation"
}

If the query is unrelated to GNDEC, return:
{
  "status": "error",
  "data": {
    "response": "I can only assist with GNDEC Ludhiana related information.",
    "isGNDECRelated": false
  },
  "reasoning": "Unrelated query"
}
`,
    });

    console.log(`✅ Gemini initialized successfully`);
    console.log(`✅ Model: ${MODEL_NAME}`);

  } catch (error) {
    console.error("❌ Gemini initialization failed:", {
      message: error.message,
      stack: error.stack,
    });
  }
}

// Initialize immediately
initializeGemini();

// -----------------------------------
// Timeout helper
// -----------------------------------
function timeoutPromise(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error("Gemini request timeout"));
    }, ms);
  });
}

// -----------------------------------
// Safe JSON parser
// -----------------------------------
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// -----------------------------------
// Delay helper (reduces rate limit)
// -----------------------------------
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -----------------------------------
// Main Chat Function
// -----------------------------------
async function chat(message) {
  try {
    if (!model) {
      throw new Error("Gemini model not initialized");
    }

    if (!message || typeof message !== "string") {
      throw new Error("Invalid message");
    }

    console.log("🤖 Gemini request started");

    // Small delay helps prevent burst rate limits
    await delay(1000);

    // Run with timeout protection
    const result = await Promise.race([
      model.generateContent(message),
      timeoutPromise(20000), // 20 sec backend timeout
    ]);

    console.log("✅ Gemini response received");

    const responseText = result.response.text();

    console.log("📦 RAW GEMINI RESPONSE:", responseText);

    if (!responseText) {
      throw new Error("Empty Gemini response");
    }

    // Remove markdown formatting if Gemini adds it
    const cleaned = responseText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // Parse JSON safely
    const parsed = safeJsonParse(cleaned);

    // If invalid JSON, wrap response safely
    if (!parsed) {
      console.warn("⚠️ Gemini returned non-JSON response");

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
    console.error("❌ FULL GEMINI ERROR:", {
      message: error.message,
      status: error.status,
      code: error.code,
      stack: error.stack,
    });

    // Timeout
    if (error.message?.includes("timeout")) {
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

    // Rate limit / quota
    if (
      error.status === 429 ||
      error.message?.includes("429") ||
      error.message?.includes("quota") ||
      error.message?.includes("rate limit")
    ) {
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

    // Invalid API key
    if (
      error.message?.includes("API key") ||
      error.message?.includes("authentication")
    ) {
      return JSON.stringify({
        status: "error",
        data: {
          response:
            "AI configuration error. Please contact administrator.",
          isGNDECRelated: false,
        },
        reasoning: "Invalid API key",
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
      reasoning: error.message || "Unknown Gemini error",
    });
  }
}

module.exports = {
  chat,
  initializeGemini,
};
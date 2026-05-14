const { GoogleGenerativeAI } = require("@google/generative-ai");

let genAI = null;
let model = null;

// -----------------------------------
// MODEL
// -----------------------------------
const MODEL_NAME = "gemini-2.5-flash";

// -----------------------------------
// INITIALIZE GEMINI
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
        temperature: 0.2,
        topP: 0.8,
        topK: 20,
        maxOutputTokens: 256,

        // VERY IMPORTANT
        responseMimeType: "application/json",
      },

      systemInstruction: `
You are a GNDEC Ludhiana assistant.

Answer ONLY GNDEC Ludhiana related questions.

Always respond with valid JSON only.

Format:
{
  "status": "success",
  "data": {
    "response": "answer here",
    "isGNDECRelated": true
  },
  "reasoning": "short reason"
}

If unrelated:
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

    console.log("✅ Gemini initialized successfully");
    console.log(`✅ Model: ${MODEL_NAME}`);

  } catch (error) {
    console.error("❌ Gemini initialization failed:", {
      message: error.message,
      stack: error.stack,
    });
  }
}

// -----------------------------------
// INITIALIZE ON START
// -----------------------------------
initializeGemini();

// -----------------------------------
// TIMEOUT HELPER
// -----------------------------------
function timeoutPromise(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error("Gemini request timeout"));
    }, ms);
  });
}

// -----------------------------------
// SAFE JSON PARSER
// -----------------------------------
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// -----------------------------------
// SMALL DELAY HELPER
// Prevents burst rate limits
// -----------------------------------
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -----------------------------------
// MAIN CHAT FUNCTION
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

    // Small delay for free-tier stability
    await delay(1000);

    // Timeout protection
    const result = await Promise.race([
      model.generateContent(message),
      timeoutPromise(20000), // 20 seconds
    ]);

    console.log("✅ Gemini response received");

    const responseText = result.response.text();

    console.log("📦 RAW GEMINI RESPONSE:");
    console.log(responseText);

    if (!responseText) {
      throw new Error("Empty Gemini response");
    }

    // Clean markdown if Gemini adds it
    const cleaned = responseText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    console.log("🧹 CLEANED RESPONSE:");
    console.log(cleaned);

    // Parse JSON safely
    const parsed = safeJsonParse(cleaned);

    // If invalid JSON
    if (!parsed) {
      console.warn("⚠️ Invalid JSON from Gemini");

      return JSON.stringify({
        status: "error",
        data: {
          response:
            "AI returned invalid response format.",
          isGNDECRelated: false,
        },
        reasoning: "Invalid JSON returned by Gemini",
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
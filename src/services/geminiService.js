const OpenAI = require("openai");

let client = null;

// -----------------------------------
// INITIALIZE GROQ
// -----------------------------------
function initializeAI() {
  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      throw new Error("Missing GROQ_API_KEY");
    }

    client = new OpenAI({
      apiKey,
      baseURL: "https://api.groq.com/openai/v1",
    });

    console.log("✅ Groq initialized successfully");

  } catch (error) {
    console.error("❌ Groq initialization failed:", {
      message: error.message,
      stack: error.stack,
    });
  }
}

// Initialize immediately
initializeAI();

// -----------------------------------
// TIMEOUT HELPER
// -----------------------------------
function timeoutPromise(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error("AI request timeout"));
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
// DELAY HELPER
// -----------------------------------
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -----------------------------------
// SYSTEM PROMPT
// -----------------------------------
const SYSTEM_PROMPT = `
You are a GNDEC Ludhiana assistant.

Rules:
- Answer ONLY GNDEC Ludhiana related questions
- Keep responses concise
- Be student-friendly
- Reject unrelated questions

Always respond in VALID JSON ONLY.

Format:
{
  "status": "success",
  "data": {
    "response": "your response",
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
`;

// -----------------------------------
// MAIN CHAT FUNCTION
// -----------------------------------
async function chat(message) {
  try {
    if (!client) {
      throw new Error("Groq client not initialized");
    }

    if (!message || typeof message !== "string") {
      throw new Error("Invalid message");
    }

    console.log("🤖 AI request started");

    await delay(300);

    // -----------------------------------
    // REQUEST
    // -----------------------------------
    const completion = await Promise.race([
      client.chat.completions.create({
        // FAST + FREE + VERY GOOD
        model: "llama-3.1-8b-instant",

        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: message,
          },
        ],

        temperature: 0.2,
        max_tokens: 256,

        response_format: {
          type: "json_object",
        },
      }),

      timeoutPromise(15000),
    ]);

    console.log("✅ AI response received");

    // -----------------------------------
    // EXTRACT RESPONSE
    // -----------------------------------
    const responseText =
      completion.choices?.[0]?.message?.content;

    console.log("📦 RAW RESPONSE:");
    console.log(responseText);

    if (!responseText) {
      throw new Error("Empty AI response");
    }

    // -----------------------------------
    // CLEAN RESPONSE
    // -----------------------------------
    const cleaned = responseText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    console.log("🧹 CLEANED RESPONSE:");
    console.log(cleaned);

    // -----------------------------------
    // PARSE JSON
    // -----------------------------------
    const parsed = safeJsonParse(cleaned);

    if (!parsed) {
      console.warn("⚠️ Invalid JSON response");

      return JSON.stringify({
        status: "error",
        data: {
          response:
            "AI returned invalid response format.",
          isGNDECRelated: false,
        },
        reasoning: "JSON parse failed",
      });
    }

    return JSON.stringify(parsed);

  } catch (error) {
    console.error("❌ FULL AI ERROR:", {
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
        reasoning: "Timeout",
      });
    }

    // Rate limit
    if (
      error.status === 429 ||
      error.message?.includes("429") ||
      error.message?.includes("rate")
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

    // Auth
    if (
      error.message?.includes("auth") ||
      error.message?.includes("API key")
    ) {
      return JSON.stringify({
        status: "error",
        data: {
          response:
            "AI configuration error.",
          isGNDECRelated: false,
        },
        reasoning: "Authentication failed",
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
      reasoning: error.message || "Unknown error",
    });
  }
}

module.exports = {
  chat,
  initializeAI,
};
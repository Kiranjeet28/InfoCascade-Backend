const { GoogleGenerativeAI } = require("@google/generative-ai");

let genAI = null;
let model = null;
let modelInitError = null;
let successfulModel = null;

// Gemini 2.5 Flash model - optimized for backend with fast response times
const MODEL_NAME = "gemini-2.5-flash";

// Initialize Gemini API with proper error handling and system instruction
function initializeGemini() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY environment variable is not set. Please configure it in your .env file."
      );
    }

    genAI = new GoogleGenerativeAI(apiKey);

    // Initialize with Gemini 2.5 Flash and system instruction
    model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      // System instruction ensures consistent backend behavior
      systemInstruction: `You are a backend utility for GNDEC Ludhiana student information system.
Your task is to process user queries about GNDEC and return a valid JSON object.
Do not include any conversational filler, markdown formatting (no \`\`\`json), or explanations.

Rules:
- Answer ONLY questions related to GNDEC Ludhiana
- Allowed topics: departments, hostels, campus navigation, faculty, timetable, admissions, events, facilities, placements, academic information
- For unrelated questions, return appropriate error status
- Output ONLY valid JSON, nothing else

Schema to follow:
{
  "status": "success" | "error",
  "data": {
    "response": "your answer here",
    "isGNDECRelated": true | false
  },
  "reasoning": "brief explanation of the response"
}

Strict Rule: If the input is invalid or unrelated to GNDEC, return status: "error" with appropriate data.`,
    });

    successfulModel = MODEL_NAME;
    console.log(`✅ Gemini 2.5 Flash model initialized successfully`);
    modelInitError = null;
    return true;
  } catch (error) {
    modelInitError = error;
    console.error("❌ Gemini initialization failed:", error.message);
    return false;
  }
}

// Initialize on module load
initializeGemini();

/**
 * Chat with Gemini 2.5 Flash
 * Returns structured JSON response from the backend model
 *
 * @param {string} message - User query
 * @returns {Promise<string>} - JSON string response from Gemini
 */
async function chat(message) {
  try {
    // Check if Gemini was properly initialized
    if (!model) {
      if (modelInitError) {
        throw new Error(
          `Gemini AI is not properly configured: ${modelInitError.message}`
        );
      }
      throw new Error("Gemini model is not initialized");
    }

    if (!message || typeof message !== "string") {
      throw new Error("Message must be a non-empty string");
    }

    // Use generateContent with the message directly
    // System instruction is already set in the model initialization
    const result = await model.generateContent(message);

    if (!result || !result.response) {
      throw new Error("No response received from Gemini API");
    }

    const responseText = result.response.text();

    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    // Attempt to parse and validate JSON response
    try {
      const jsonResponse = JSON.parse(responseText);
      return JSON.stringify(jsonResponse);
    } catch (parseError) {
      // If response is not valid JSON, wrap it in a structured format
      console.warn("Response was not valid JSON, wrapping it:", parseError.message);
      return JSON.stringify({
        status: "success",
        data: {
          response: responseText,
          isGNDECRelated: true
        },
        reasoning: "Response parsed from non-JSON format"
      });
    }
  } catch (error) {
    console.error("Gemini API error:", {
      message: error.message,
      status: error.status,
      code: error.code,
      model: successfulModel,
    });

    // Return structured error response
    let errorMessage = "Failed to process request";

    if (error.status === 404) {
      errorMessage = `The Gemini model '${successfulModel}' is not available. API quota may be exceeded or API key invalid.`;
    } else if (error.status === 401 || error.status === 403) {
      errorMessage = "Invalid Gemini API key or insufficient permissions";
    } else if (error.status === 429) {
      errorMessage = "Rate limit exceeded. Please try again in a few moments.";
    } else if (error.message?.includes("API key not valid")) {
      errorMessage = "Invalid or expired Gemini API key";
    }

    // Return JSON error response
    return JSON.stringify({
      status: "error",
      data: {
        response: errorMessage,
        isGNDECRelated: false
      },
      reasoning: "Error occurred during AI processing"
    });
  }
}

module.exports = { chat, initializeGemini, successfulModel: () => successfulModel };

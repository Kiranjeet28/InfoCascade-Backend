const { GoogleGenerativeAI } = require("@google/generative-ai");

let genAI = null;
let model = null;
let modelInitError = null;
let successfulModel = null;

// List of models to try in order of preference
const MODELS_TO_TRY = [
  "gemini-2.5-flash",
];

// Initialize Gemini API with proper error handling
function initializeGemini() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY environment variable is not set. Please configure it in your .env file."
      );
    }

    genAI = new GoogleGenerativeAI(apiKey);

    // Try each model in order
    for (const modelName of MODELS_TO_TRY) {
      try {
        model = genAI.getGenerativeModel({ model: modelName });
        successfulModel = modelName;
        console.log(`✅ Gemini model initialized: ${modelName}`);
        modelInitError = null;
        return true;
      } catch (error) {
        console.warn(
          `⚠️ Model ${modelName} not available:`,
          error.message
        );
        continue;
      }
    }

    // If we get here, no models worked
    throw new Error(
      `None of the supported models are available: ${MODELS_TO_TRY.join(
        ", "
      )}. Your API key may not have access to Gemini models or the quota may be exceeded.`
    );
  } catch (error) {
    modelInitError = error;
    console.error("❌ Gemini initialization failed:", error.message);
    return false;
  }
}

// Initialize on module load
initializeGemini();

async function chat(message, systemPrompt) {
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

    const prompt = `${systemPrompt}\n\nUser: ${message}`;

    const result = await model.generateContent(prompt);

    if (!result || !result.response) {
      throw new Error("No response received from Gemini API");
    }

    const response = result.response.text();

    if (!response) {
      throw new Error("Empty response from Gemini API");
    }

    return response;
  } catch (error) {
    console.error("Gemini API error:", {
      message: error.message,
      status: error.status,
      code: error.code,
      model: successfulModel,
    });

    // Provide more helpful error messages
    if (error.status === 404) {
      throw new Error(
        `The Gemini model '${successfulModel}' is not available. This may indicate API quota exceeded or invalid API key.`
      );
    } else if (error.status === 401 || error.status === 403) {
      throw new Error("Invalid Gemini API key or insufficient permissions");
    } else if (error.status === 429) {
      throw new Error(
        "Rate limit exceeded. Please try again in a few moments."
      );
    } else if (error.message?.includes("API key not valid")) {
      throw new Error("Invalid or expired Gemini API key");
    }

    throw new Error(`Failed to generate AI response: ${error.message}`);
  }
}

module.exports = { chat, initializeGemini, successfulModel: () => successfulModel };

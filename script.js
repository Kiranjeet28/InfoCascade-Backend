require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

const MODEL_NAME = "gemini-2.5-flash";

async function testGemini() {
  try {
    console.log("🚀 Starting Gemini test...\n");

    // -----------------------------------
    // Check API key
    // -----------------------------------
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY in .env");
    }

    console.log("✅ API Key Found");

    // -----------------------------------
    // Initialize Gemini
    // -----------------------------------
    const genAI = new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY
    );

    console.log("✅ Gemini SDK initialized");

    // -----------------------------------
    // Create model
    // -----------------------------------
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,

      generationConfig: {
        temperature: 0.3,
        topP: 0.8,
        topK: 20,
        maxOutputTokens: 256,
      },

      systemInstruction: `
You are a GNDEC assistant.

Respond ONLY in JSON format.

Example:
{
  "status": "success",
  "data": {
    "response": "GNDEC has multiple departments.",
    "isGNDECRelated": true
  },
  "reasoning": "GNDEC related query"
}
`,
    });

    console.log(`✅ Model initialized: ${MODEL_NAME}`);

    // -----------------------------------
    // Test prompt
    // -----------------------------------
    const prompt = "Tell me about GNDEC placement statistics.";

    console.log("\n📤 Sending prompt:");
    console.log(prompt);

    // -----------------------------------
    // Measure response time
    // -----------------------------------
    console.time("\n⏱ Gemini Response Time");

    const result = await model.generateContent(prompt);

    console.timeEnd("\n⏱ Gemini Response Time");

    // -----------------------------------
    // Extract response
    // -----------------------------------
    const response = result.response.text();

    console.log("\n📦 RAW RESPONSE:\n");
    console.log(response);

    // -----------------------------------
    // Clean markdown
    // -----------------------------------
    const cleaned = response
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    console.log("\n🧹 CLEANED RESPONSE:\n");
    console.log(cleaned);

    // -----------------------------------
    // Parse JSON
    // -----------------------------------
    try {
      const parsed = JSON.parse(cleaned);

      console.log("\n✅ VALID JSON RESPONSE:\n");

      console.log(
        JSON.stringify(parsed, null, 2)
      );

    } catch (parseError) {
      console.error("\n❌ INVALID JSON RESPONSE");

      console.error(parseError.message);
    }

  } catch (error) {
    console.error("\n❌ GEMINI TEST FAILED\n");

    console.error({
      message: error.message,
      status: error.status,
      code: error.code,
      stack: error.stack,
    });
  }
}

testGemini();
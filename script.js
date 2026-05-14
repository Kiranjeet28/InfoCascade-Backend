require("dotenv").config();

const OpenAI = require("openai");

// -----------------------------------
// OPENROUTER CONFIG
// -----------------------------------
const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// -----------------------------------
// MODEL
// -----------------------------------
const MODEL_NAME = "deepseek/deepseek-chat";

// -----------------------------------
// MAIN TEST FUNCTION
// -----------------------------------
async function testAI() {
  try {
    console.log("🚀 Starting OpenRouter AI test...\n");

    // -----------------------------------
    // CHECK API KEY
    // -----------------------------------
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error(
        "Missing OPENROUTER_API_KEY in .env"
      );
    }

    console.log("✅ OpenRouter API Key Found");

    // -----------------------------------
    // TEST PROMPT
    // -----------------------------------
    const prompt =
      "Tell me about GNDEC placement statistics.";

    console.log("\n📤 Sending prompt:");
    console.log(prompt);

    // -----------------------------------
    // MEASURE RESPONSE TIME
    // -----------------------------------
    console.time("\n⏱ AI Response Time");

    // -----------------------------------
    // API REQUEST
    // -----------------------------------
    const completion =
      await client.chat.completions.create({
        model: MODEL_NAME,

        messages: [
          {
            role: "system",
            content: `
You are a GNDEC Ludhiana assistant.

Rules:
- Answer ONLY GNDEC related questions
- Keep responses concise
- Respond ONLY in valid JSON
- Do not use markdown

Format:
{
  "status": "success",
  "data": {
    "response": "your answer",
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
          },
          {
            role: "user",
            content: prompt,
          },
        ],

        temperature: 0.2,
        max_tokens: 256,

        response_format: {
          type: "json_object",
        },
      });

    console.timeEnd("\n⏱ AI Response Time");

    // -----------------------------------
    // EXTRACT RESPONSE
    // -----------------------------------
    const response =
      completion.choices?.[0]?.message?.content;

    console.log("\n📦 RAW RESPONSE:\n");
    console.log(response);

    if (!response) {
      throw new Error("Empty AI response");
    }

    // -----------------------------------
    // CLEAN RESPONSE
    // -----------------------------------
    const cleaned = response
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    console.log("\n🧹 CLEANED RESPONSE:\n");
    console.log(cleaned);

    // -----------------------------------
    // PARSE JSON
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
    console.error("\n❌ OPENROUTER TEST FAILED\n");

    console.error({
      message: error.message,
      status: error.status,
      code: error.code,
      stack: error.stack,
    });
  }
}

// -----------------------------------
// RUN TEST
// -----------------------------------
testAI();
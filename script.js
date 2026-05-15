require("dotenv").config();

const { chat } = require("./src/services/geminiService");

// -----------------------------------
// TEST FUNCTION
// -----------------------------------
async function testAI() {
  try {
    console.log("🚀 Starting Groq AI test...\n");

    // -----------------------------------
    // CHECK ENV
    // -----------------------------------
    console.log(
      "🔑 GROQ KEY EXISTS:",
      !!process.env.GROQ_API_KEY
    );

    if (!process.env.GROQ_API_KEY) {
      throw new Error(
        "Missing GROQ_API_KEY in .env"
      );
    }

    // -----------------------------------
    // TEST MESSAGE
    // -----------------------------------
    const message =
      "Tell me about GNDEC placement statistics.";

    console.log("📤 Sending message:");
    console.log(message);

    // -----------------------------------
    // TIMER
    // -----------------------------------
    console.time("\n⏱ AI Response Time");

    // -----------------------------------
    // CALL AI
    // -----------------------------------
    const response = await chat(message);

    console.timeEnd("\n⏱ AI Response Time");

    // -----------------------------------
    // RAW RESPONSE
    // -----------------------------------
    console.log("\n📦 RAW RESPONSE:\n");
    console.log(response);

    // -----------------------------------
    // PARSE RESPONSE
    // -----------------------------------
    try {
      const parsed = JSON.parse(response);

      console.log("\n✅ PARSED RESPONSE:\n");

      console.log(
        JSON.stringify(parsed, null, 2)
      );

    } catch (parseError) {
      console.error("\n❌ JSON PARSE FAILED");

      console.error(parseError.message);
    }

  } catch (error) {
    console.error("\n❌ TEST FAILED\n");

    console.error({
      message: error.message,
      stack: error.stack,
    });
  }
}

// -----------------------------------
// RUN TEST
// -----------------------------------
testAI();
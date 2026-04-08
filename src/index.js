require("dotenv").config();
const app = require("./app");
const connectDB = require("../config/db");
const {
  initializeNotificationService,
} = require("./services/notificationService");

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  // Initialize notification service
  try {
    const initResult = initializeNotificationService();
    if (initResult.success) {
      console.log("✅ Notification service initialized");
    } else {
      console.warn(
        "⚠️ Notification service initialization failed:",
        initResult.message,
      );
    }
  } catch (error) {
    console.error("❌ Error initializing notification service:", error.message);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});

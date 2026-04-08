const Expo = require("expo-server-sdk").default;
const mongoose = require("mongoose");

let expo = null;
let PushTokenModel = null;
let NotificationHistoryModel = null;
let StudentModel = null;

function initializeNotificationService() {
  try {
    if (!process.env.EXPO_ACCESS_TOKEN) {
      console.error("[Notification] ❌ EXPO_ACCESS_TOKEN not configured");
      return { success: false, message: "EXPO_ACCESS_TOKEN not configured" };
    }

    expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
    console.log("[Notification] ✅ Expo client initialized");

    try {
      PushTokenModel = require("../models/PushToken");
      NotificationHistoryModel = require("../models/NotificationHistory");
      StudentModel = require("../models/studentModel");
      console.log("[Notification] ✅ All models loaded");
    } catch (e) {
      console.error("[Notification] ⚠️ Model loading warning:", e.message);
    }

    return { success: true, message: "Notification service initialized" };
  } catch (error) {
    console.error("[Notification] ❌ Initialization failed:", error.message);
    return { success: false, message: error.message };
  }
}

function getServiceStatus() {
  return {
    expoInitialized: !!expo,
    modelsLoaded: !!(PushTokenModel && NotificationHistoryModel),
    accessTokenConfigured: !!process.env.EXPO_ACCESS_TOKEN,
    status:
      expo && PushTokenModel && NotificationHistoryModel
        ? "ready"
        : "not-ready",
  };
}

async function registerToken(studentId, token, deviceType, deviceName) {
  try {
    if (!studentId || !token) throw new Error("studentId and token required");
    if (!PushTokenModel) throw new Error("PushToken model not loaded");
    if (!Expo.isExpoPushToken(token))
      throw new Error("Invalid Expo token format");

    const record = await PushTokenModel.findOneAndUpdate(
      { token },
      {
        studentId,
        token,
        deviceType: deviceType || "unknown",
        deviceName: deviceName || "Unknown",
        isActive: true,
        lastUsedAt: new Date(),
      },
      { upsert: true, new: true },
    );

    console.log("[Notification] ✅ Token registered:", studentId);
    return record;
  } catch (error) {
    console.error("[Notification] ❌ Register token error:", error.message);
    throw error;
  }
}

async function getStudentTokens(studentId) {
  try {
    if (!studentId || !PushTokenModel) return [];

    const tokens = await PushTokenModel.find({
      studentId,
      isActive: true,
    })
      .select("token")
      .lean();

    return tokens.map((t) => t.token);
  } catch (error) {
    console.error("[Notification] ❌ Get tokens error:", error.message);
    return [];
  }
}

async function sendPushToStudent(studentId, options) {
  try {
    const { title, body, notificationType = "general", data = {} } = options;

    if (!studentId || !title || !body)
      throw new Error("Missing required fields");
    if (!expo) throw new Error("Expo not initialized");

    const tokens = await getStudentTokens(studentId);
    if (tokens.length === 0) {
      console.log("[Notification] ℹ️ No tokens for student:", studentId);
      return { success: false, sentTo: 0, message: "No tokens" };
    }

    const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t));
    if (validTokens.length === 0) {
      return { success: false, sentTo: 0, message: "No valid tokens" };
    }

    const messages = validTokens.map((token) => ({
      to: token,
      sound: "default",
      title,
      body,
      data: { notificationType, ...data },
    }));

    let sentCount = 0;
    const allTickets = [];
    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        sentCount += ticketChunk.length;
        allTickets.push(...ticketChunk);
      } catch (e) {
        console.error("[Notification] ❌ Chunk send error:", e.message);
      }
    }

    if (NotificationHistoryModel) {
      try {
        await NotificationHistoryModel.create({
          studentId,
          title,
          body,
          notificationType,
          tokensSent: sentCount,
          data,
          status: "sent",
          expoTickets: allTickets,
        });
      } catch (e) {
        console.error("[Notification] ⚠️ History log error:", e.message);
      }
    }

    if (PushTokenModel) {
      try {
        await PushTokenModel.updateMany(
          { studentId, isActive: true },
          { lastUsedAt: new Date() },
        );
      } catch (e) {
        console.error("[Notification] ⚠️ Update error:", e.message);
      }
    }

    console.log(
      `[Notification] ✅ Sent to ${studentId}: ${sentCount}/${validTokens.length}`,
    );
    return {
      success: true,
      sentTo: sentCount,
      totalTokens: validTokens.length,
    };
  } catch (error) {
    console.error("[Notification] ❌ Send error:", error.message);
    return { success: false, sentTo: 0, message: error.message };
  }
}

async function sendPushToStudents(studentIds, options) {
  try {
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      throw new Error("Invalid studentIds array");
    }

    const results = [];
    for (const studentId of studentIds) {
      const result = await sendPushToStudent(studentId, options);
      results.push({ studentId, ...result });
    }

    console.log(`[Notification] ✅ Sent to ${studentIds.length} students`);
    return results;
  } catch (error) {
    console.error("[Notification] ❌ Bulk send error:", error.message);
    throw error;
  }
}

async function sendPushToAll(options) {
  try {
    if (!StudentModel) throw new Error("Student model not loaded");

    const students = await StudentModel.find({}).select("_id").lean();
    if (students.length === 0) {
      return { success: false, message: "No students found" };
    }

    const studentIds = students.map((s) => s._id.toString());
    const results = await sendPushToStudents(studentIds, options);

    console.log("[Notification] ✅ Broadcast sent to all");
    return { success: true, totalStudents: studentIds.length, results };
  } catch (error) {
    console.error("[Notification] ❌ Broadcast error:", error.message);
    throw error;
  }
}

async function markNotificationAsRead(studentId, notificationId) {
  try {
    if (!studentId || !notificationId) throw new Error("Missing IDs");
    if (!NotificationHistoryModel) throw new Error("Model not loaded");

    const updated = await NotificationHistoryModel.findOneAndUpdate(
      { _id: notificationId, studentId },
      { readAt: new Date(), status: "read" },
      { new: true },
    );

    if (!updated) throw new Error("Notification not found");

    console.log("[Notification] ✅ Marked as read:", notificationId);
    return updated;
  } catch (error) {
    console.error("[Notification] ❌ Mark read error:", error.message);
    throw error;
  }
}

async function getNotificationHistory(studentId, limit = 20, skip = 0) {
  try {
    if (!studentId || !NotificationHistoryModel) {
      throw new Error("Invalid parameters");
    }

    const safeLimit = Math.max(1, Math.min(100, limit));
    const safeSkip = Math.max(0, skip);

    const [notifications, total] = await Promise.all([
      NotificationHistoryModel.find({ studentId })
        .sort({ sentAt: -1 })
        .limit(safeLimit)
        .skip(safeSkip)
        .lean(),
      NotificationHistoryModel.countDocuments({ studentId }),
    ]);

    console.log(`[Notification] ✅ Got ${notifications.length} notifications`);
    return {
      success: true,
      total,
      notifications,
      limit: safeLimit,
      skip: safeSkip,
    };
  } catch (error) {
    console.error("[Notification] ❌ History error:", error.message);
    return {
      success: false,
      total: 0,
      notifications: [],
      error: error.message,
    };
  }
}

async function deactivateToken(token) {
  try {
    if (!token || !PushTokenModel) throw new Error("Invalid token");

    const updated = await PushTokenModel.findOneAndUpdate(
      { token },
      { isActive: false, deactivatedAt: new Date() },
      { new: true },
    );

    if (!updated) throw new Error("Token not found");

    console.log("[Notification] ✅ Token deactivated");
    return updated;
  } catch (error) {
    console.error("[Notification] ❌ Deactivate error:", error.message);
    throw error;
  }
}

module.exports = {
  initializeNotificationService,
  getServiceStatus,
  registerToken,
  getStudentTokens,
  sendPushToStudent,
  sendPushToStudents,
  sendPushToAll,
  markNotificationAsRead,
  getNotificationHistory,
  deactivateToken,
};

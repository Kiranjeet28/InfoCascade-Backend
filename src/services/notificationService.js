const Expo = require('expo-server-sdk').default;
const mongoose = require('mongoose');

// Global variables
let expo = null;
let PushTokenModel = null;
let NotificationHistoryModel = null;
let StudentModel = null;

/**
 * Initialize Notification Service
 * Sets up Expo client and loads required models
 * @returns {Object} - { success: boolean, message: string }
 */
function initializeNotificationService() {
  try {
    // Check if EXPO_ACCESS_TOKEN is configured
    if (!process.env.EXPO_ACCESS_TOKEN) {
      console.error('[Notification] ❌ EXPO_ACCESS_TOKEN not configured in environment variables');
      return { success: false, message: 'EXPO_ACCESS_TOKEN not configured' };
    }

    // Initialize Expo client
    try {
      expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
      console.log('[Notification] ✅ Expo client initialized successfully');
    } catch (expoError) {
      console.error('[Notification] ❌ Failed to initialize Expo:', expoError.message);
      return { success: false, message: 'Failed to initialize Expo client' };
    }

    // Load models
    try {
      PushTokenModel = require('../models/PushToken');
      NotificationHistoryModel = require('../models/NotificationHistory');
      StudentModel = require('../models/studentModel');
      console.log('[Notification] ✅ All models loaded successfully');
    } catch (modelError) {
      console.error('[Notification] ⚠️ Models not fully loaded:', modelError.message);
      // Don't fail completely, some models might fail
    }

    console.log('[Notification] ✅ Notification service initialized successfully');
    return { success: true, message: 'Notification service initialized' };
  } catch (error) {
    console.error('[Notification] ❌ Error initializing notification service:', error.message);
    return { success: false, message: 'Initialization failed', error: error.message };
  }
}

/**
 * Get Service Status
 * Returns the current status of the notification service
 * @returns {Object} - Service status details
 */
function getServiceStatus() {
  try {
    const isReady = !!(expo && PushTokenModel && NotificationHistoryModel && process.env.EXPO_ACCESS_TOKEN);
    
    return {
      expoInitialized: !!expo,
      modelsLoaded: !!(PushTokenModel && NotificationHistoryModel),
      accessTokenConfigured: !!process.env.EXPO_ACCESS_TOKEN,
      status: isReady ? 'ready' : 'not-ready'
    };
  } catch (error) {
    console.error('[Notification] ❌ Error getting service status:', error.message);
    return {
      expoInitialized: false,
      modelsLoaded: false,
      accessTokenConfigured: false,
      status: 'error'
    };
  }
}

/**
 * Register Push Token
 * Register or update a device token for a student
 * @param {string} studentId - Student ID
 * @param {string} token - Push notification token
 * @param {string} deviceType - Device type (ios/android/web)
 * @param {string} deviceName - Device name
 * @returns {Object} - Saved record or error
 */
async function registerToken(studentId, token, deviceType, deviceName) {
  try {
    // Validate inputs
    if (!studentId || !token) {
      throw new Error('studentId and token are required');
    }

    if (!PushTokenModel) {
      throw new Error('PushToken model not loaded');
    }

    // Validate token format
    if (!Expo.isExpoPushToken(token)) {
      throw new Error('Invalid Expo push token format. Must start with ExponentPushToken[');
    }

    // Upsert token record
    const record = await PushTokenModel.findOneAndUpdate(
      { token },
      {
        studentId,
        token,
        deviceType: deviceType || 'unknown',
        deviceName: deviceName || 'Unknown Device',
        isActive: true,
        lastUsedAt: new Date()
      },
      { upsert: true, new: true, runValidators: true }
    );

    console.log('[Notification] ✅ Token registered successfully for student:', studentId);
    return record;
  } catch (error) {
    console.error('[Notification] ❌ Error registering token:', error.message);
    throw error;
  }
}

/**
 * Get Student Tokens
 * Retrieve all active push tokens for a student
 * @param {string} studentId - Student ID
 * @returns {Array} - Array of token strings
 */
async function getStudentTokens(studentId) {
  try {
    if (!studentId) {
      throw new Error('studentId is required');
    }

    if (!PushTokenModel) {
      throw new Error('PushToken model not loaded');
    }

    const tokens = await PushTokenModel.find({
      studentId,
      isActive: true
    }).select('token').lean();

    const tokenStrings = tokens.map(t => t.token);
    console.log(`[Notification] ✅ Retrieved ${tokenStrings.length} active tokens for student: ${studentId}`);
    return tokenStrings;
  } catch (error) {
    console.error('[Notification] ❌ Error getting student tokens:', error.message);
    return [];
  }
}

/**
 * Send Push to Student
 * Send a push notification to a specific student
 * @param {string} studentId - Student ID
 * @param {Object} options - { title, body, notificationType, data }
 * @returns {Object} - Send result with status
 */
async function sendPushToStudent(studentId, options) {
  try {
    const { title, body, notificationType = 'general', data = {} } = options;

    // Validate inputs
    if (!studentId || !title || !body) {
      throw new Error('studentId, title, and body are required');
    }

    if (!expo) {
      throw new Error('Expo client not initialized');
    }

    // Get active tokens
    const tokens = await getStudentTokens(studentId);

    if (tokens.length === 0) {
      console.log(`[Notification] ℹ️ No active tokens found for student: ${studentId}`);
      return { success: false, sentTo: 0, message: 'No tokens', totalTokens: 0 };
    }

    // Validate tokens with Expo
    const validTokens = tokens.filter(token => Expo.isExpoPushToken(token));

    if (validTokens.length === 0) {
      console.error('[Notification] ❌ No valid tokens found for student:', studentId);
      return { success: false, sentTo: 0, message: 'No valid tokens', totalTokens: tokens.length };
    }

    // Create messages
    const messages = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: {
        notificationType,
        ...data
      }
    }));

    // Send notifications in batches
    let sentCount = 0;
    const notificationId = new mongoose.Types.ObjectId().toString();
    const allTickets = [];

    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        sentCount += ticketChunk.length;
        allTickets.push(...ticketChunk);
      } catch (chunkError) {
        console.error('[Notification] ❌ Error sending notification chunk:', chunkError.message);
      }
    }

    // Log notification to history
    if (NotificationHistoryModel) {
      try {
        await NotificationHistoryModel.create({
          studentId,
          title,
          body,
          notificationType,
          sentAt: new Date(),
          tokensSent: sentCount,
          data,
          status: 'sent',
          expoTickets: allTickets
        });
      } catch (historyError) {
        console.error('[Notification] ❌ Error logging notification to history:', historyError.message);
      }
    }

    // Update lastUsedAt on tokens
    if (PushTokenModel) {
      try {
        await PushTokenModel.updateMany(
          { studentId, isActive: true },
          { lastUsedAt: new Date() }
        );
      } catch (updateError) {
        console.error('[Notification] ❌ Error updating token timestamps:', updateError.message);
      }
    }

    console.log(`[Notification] ✅ Push notification sent to student ${studentId}: ${sentCount}/${validTokens.length} tokens`);
    return {
      success: true,
      sentTo: sentCount,
      totalTokens: validTokens.length,
      notificationId
    };
  } catch (error) {
    console.error('[Notification] ❌ Error sending push to student:', error.message);
    return { success: false, sentTo: 0, message: error.message, error };
  }
}

/**
 * Send Push to Students
 * Send a push notification to multiple students
 * @param {Array} studentIds - Array of student IDs
 * @param {Object} options - { title, body, notificationType, data }
 * @returns {Array} - Array of results for each student
 */
async function sendPushToStudents(studentIds, options) {
  try {
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      throw new Error('studentIds must be a non-empty array');
    }

    const results = [];

    for (const studentId of studentIds) {
      const result = await sendPushToStudent(studentId, options);
      results.push({
        studentId,
        ...result
      });
    }

    console.log(`[Notification] ✅ Sent notifications to ${studentIds.length} students`);
    return results;
  } catch (error) {
    console.error('[Notification] ❌ Error sending push to students:', error.message);
    throw error;
  }
}

/**
 * Send Push to All
 * Send a push notification to all students with active tokens
 * @param {Object} options - { title, body, notificationType, data }
 * @returns {Object|Array} - Aggregated results
 */
async function sendPushToAll(options) {
  try {
    if (!StudentModel) {
      throw new Error('Student model not loaded');
    }

    // Query all students
    const students = await StudentModel.find({}).select('_id').lean();

    if (students.length === 0) {
      console.log('[Notification] ℹ️ No students found');
      return { success: false, message: 'No students found', totalStudents: 0 };
    }

    const studentIds = students.map(s => s._id.toString());

    // Call sendPushToStudents
    const results = await sendPushToStudents(studentIds, options);

    console.log(`[Notification] ✅ Broadcast notification sent to all students`);
    return {
      success: true,
      totalStudents: studentIds.length,
      results
    };
  } catch (error) {
    console.error('[Notification] ❌ Error sending push to all:', error.message);
    throw error;
  }
}

/**
 * Mark Notification as Read
 * Update notification read status
 * @param {string} studentId - Student ID
 * @param {string} notificationId - Notification ID
 * @returns {Object} - Updated record or error
 */
async function markNotificationAsRead(studentId, notificationId) {
  try {
    if (!studentId || !notificationId) {
      throw new Error('studentId and notificationId are required');
    }

    if (!NotificationHistoryModel) {
      throw new Error('NotificationHistory model not loaded');
    }

    // Update notification and verify ownership
    const updated = await NotificationHistoryModel.findOneAndUpdate(
      { _id: notificationId, studentId },
      { readAt: new Date(), status: 'read' },
      { new: true }
    );

    if (!updated) {
      throw new Error('Notification not found or does not belong to this student');
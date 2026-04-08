/**
 * Push Notifications Routes
 * 
 * Protected Routes (Require Authentication):
 * POST /api/notifications/register-token - Register device token
 * POST /api/notifications/send-test - Send test notification
 * GET /api/notifications/history - Get notification history
 * PUT /api/notifications/:notificationId/read - Mark as read
 * 
 * Admin-Only Routes (Require Authentication + Admin Role):
 * POST /api/notifications/send-to-student - Send to single student
 * POST /api/notifications/send-bulk - Send to multiple students
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

// Protected student routes
router.post('/register-token', authMiddleware, notificationController.registerToken);
router.post('/send-test', authMiddleware, notificationController.sendTestNotification);
router.get('/history', authMiddleware, notificationController.getHistory);
router.put('/:notificationId/read', authMiddleware, notificationController.markAsRead);

// Admin-only routes
router.post('/send-to-student', authMiddleware, notificationController.sendToStudent);
router.post('/send-bulk', authMiddleware, notificationController.sendBulk);

module.exports = router;

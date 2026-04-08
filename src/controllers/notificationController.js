const notificationService = require('../services/notificationService');

const fail = (res, status, code, message, extra = {}) =>
  res.status(status).json({ success: false, code, message, ...extra });

const success = (res, status, data = {}) =>
  res.status(status).json({ success: true, ...data });

exports.registerToken = async (req, res, next) => {
  try {
    const studentId = req.student?._id || req.student?.id;
    if (!studentId) {
      return fail(res, 401, 'UNAUTHORIZED', 'Student ID not found');
    }

    const { token, deviceType, deviceName } = req.body;

    if (!token) {
      return fail(res, 400, 'TOKEN_REQUIRED', 'Push notification token is required');
    }

    if (!deviceType) {
      return fail(res, 400, 'DEVICE_TYPE_REQUIRED', 'Device type is required', {
        allowedValues: ['ios', 'android', 'web'],
      });
    }

    const registeredToken = await notificationService.registerToken(
      studentId,
      token,
      deviceType,
      deviceName
    );

    if (!registeredToken) {
      return fail(res, 500, 'REGISTRATION_FAILED', 'Failed to register device token');
    }

    return success(res, 201, {
      message: 'Device token registered successfully',
      data: registeredToken,
    });
  } catch (err) {
    next(err);
  }
};

exports.sendTestNotification = async (req, res, next) => {
  try {
    const studentId = req.student?._id || req.student?.id;
    if (!studentId) {
      return fail(res, 401, 'UNAUTHORIZED', 'Student ID not found');
    }

    const { title, body } = req.body;

    if (!title) {
      return fail(res, 400, 'TITLE_REQUIRED', 'Notification title is required');
    }

    if (!body) {
      return fail(res, 400, 'BODY_REQUIRED', 'Notification body is required');
    }

    const result = await notificationService.sendPushToStudent(studentId, {
      title,
      body,
      notificationType: 'test',
    });

    if (!result) {
      return fail(res, 500, 'SEND_FAILED', 'Failed to send test notification');
    }

    return success(res, 200, {
      message: 'Test notification sent successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

exports.sendToStudent = async (req, res, next) => {
  try {
    const isAdmin = req.student?.isAdmin === true || req.student?.role === 'admin';
    if (!isAdmin) {
      return fail(res, 403, 'ADMIN_REQUIRED', 'Admin access required to send notifications');
    }

    const { studentId, title, body, notificationType, data } = req.body;

    if (!studentId) {
      return fail(res, 400, 'STUDENT_ID_REQUIRED', 'Target student ID is required');
    }

    if (!title) {
      return fail(res, 400, 'TITLE_REQUIRED', 'Notification title is required');
    }

    if (!body) {
      return fail(res, 400, 'BODY_REQUIRED', 'Notification body is required');
    }

    const result = await notificationService.sendPushToStudent(studentId, {
      title,
      body,
      notificationType: notificationType || 'general',
      data: data || {},
    });

    if (!result) {
      return fail(res, 500, 'SEND_FAILED', 'Failed to send notification to student');
    }

    return success(res, 200, {
      message: 'Notification sent successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

exports.sendBulk = async (req, res, next) => {
  try {
    const isAdmin = req.student?.isAdmin === true || req.student?.role === 'admin';
    if (!isAdmin) {
      return fail(res, 403, 'ADMIN_REQUIRED', 'Admin access required');
    }

    const { studentIds, title, body, notificationType, data } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return fail(res, 400, 'STUDENT_IDS_REQUIRED', 'Array of student IDs is required');
    }

    if (!title) {
      return fail(res, 400, 'TITLE_REQUIRED', 'Notification title is required');
    }

    if (!body) {
      return fail(res, 400, 'BODY_REQUIRED', 'Notification body is required');
    }

    const result = await notificationService.sendPushToStudents(studentIds, {
      title,
      body,
      notificationType: notificationType || 'general',
      data: data || {},
    });

    if (!result) {
      return fail(res, 500, 'SEND_FAILED', 'Failed to send bulk notifications');
    }

    return success(res, 200, {
      message: 'Bulk notification sent successfully',
      data: {
        totalAttempted: studentIds.length,
        results: result,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const studentId = req.student?._id || req.student?.id;
    if (!studentId) {
      return fail(res, 401, 'UNAUTHORIZED', 'Student ID not found');
    }

    let limit = parseInt(req.query.limit) || 20;
    let skip = parseInt(req.query.skip) || 0;

    if (limit < 1 || limit > 100) {
      limit = 20;
    }
    if (skip < 0) {
      skip = 0;
    }

    const result = await notificationService.getNotificationHistory(studentId, limit, skip);

    if (!result) {
      return fail(res, 500, 'HISTORY_FAILED', 'Failed to retrieve notification history');
    }

    return success(res, 200, {
      message: 'Notification history retrieved',
      data: {
        notifications: result.notifications || [],
        pagination: {
          total: result.total || 0,
          limit,
          skip,
          hasMore: (skip + limit) < (result.total || 0),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const studentId = req.student?._id || req.student?.id;
    if (!studentId) {
      return fail(res, 401, 'UNAUTHORIZED', 'Student ID not found');
    }

    const { notificationId } = req.params;

    if (!notificationId) {
      return fail(res, 400, 'NOTIFICATION_ID_REQUIRED', 'Notification ID is required');
    }

    const updatedNotification = await notificationService.markNotificationAsRead(
      studentId,
      notificationId
    );

    if (!updatedNotification) {
      return fail(res, 404, 'NOT_FOUND', 'Notification not found');
    }

    return success(res, 200, {
      message: 'Notification marked as read',
      data: updatedNotification,
    });
  } catch (err) {
    next(err);
  }
};

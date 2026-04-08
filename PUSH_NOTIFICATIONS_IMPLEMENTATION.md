# Push Notifications Implementation Guide

## ✅ SETUP COMPLETE

All push notification files have been created and integrated into your backend.

---

## 📦 Files Created

### Models (Already created)
- ✅ `src/models/PushToken.js` - Store device push tokens
- ✅ `src/models/NotificationHistory.js` - Track sent notifications

### Services
- ✅ `src/services/notificationService.js` - Expo SDK integration

### Controllers
- ✅ `src/controllers/notificationController.js` - Request handlers

### Routes
- ✅ `src/routes/notifications.js` - API endpoints

### Middleware
- ✅ `src/middleware/authMiddleware.js` - JWT authentication

### Updated Files
- ✅ `src/routes/index.js` - Added notifications route
- ✅ `src/index.js` - Initialize notification service

---

## 🚀 Installation Steps

### Step 1: Install Expo Server SDK
```bash
npm install expo-server-sdk
```

### Step 2: Get Expo Access Token
1. Go to https://expo.dev/access-tokens
2. Create new token named "InfoCascade Push Notifications"
3. Copy the token

### Step 3: Add to .env
```
EXPO_ACCESS_TOKEN=your_token_here
JWT_SECRET=your_jwt_secret
```

### Step 4: Start Server
```bash
npm run dev
```

You should see:
```
✅ Notification service initialized
✅ Expo client initialized
✅ All models loaded
```

---

## 📡 API Endpoints

### Public Endpoints (Protected by JWT)

#### 1. Register Device Token
```bash
POST /api/notifications/register-token

Headers:
  Authorization: Bearer JWT_TOKEN
  Content-Type: application/json

Body:
{
  "token": "ExponentPushToken[xxx]",
  "deviceType": "ios",
  "deviceName": "iPhone 12"
}

Response:
{
  "success": true,
  "message": "Device token registered successfully",
  "data": { ... }
}
```

#### 2. Send Test Notification
```bash
POST /api/notifications/send-test

Headers:
  Authorization: Bearer JWT_TOKEN
  Content-Type: application/json

Body:
{
  "title": "Test",
  "body": "Test notification"
}

Response:
{
  "success": true,
  "message": "Test notification sent successfully",
  "data": { sentTo: 1, totalTokens: 1 }
}
```

#### 3. Get Notification History
```bash
GET /api/notifications/history?limit=20&skip=0

Headers:
  Authorization: Bearer JWT_TOKEN

Response:
{
  "success": true,
  "message": "Notification history retrieved",
  "data": {
    "notifications": [...],
    "pagination": {
      "total": 50,
      "limit": 20,
      "skip": 0,
      "hasMore": true
    }
  }
}
```

#### 4. Mark Notification as Read
```bash
PUT /api/notifications/:notificationId/read

Headers:
  Authorization: Bearer JWT_TOKEN

Response:
{
  "success": true,
  "message": "Notification marked as read",
  "data": { ... }
}
```

### Admin-Only Endpoints

#### 5. Send to Single Student
```bash
POST /api/notifications/send-to-student

Headers:
  Authorization: Bearer ADMIN_JWT_TOKEN
  Content-Type: application/json

Body:
{
  "studentId": "student_id_here",
  "title": "Important Update",
  "body": "You have a new assignment",
  "notificationType": "assignment",
  "data": { "assignmentId": "123" }
}

Response:
{
  "success": true,
  "message": "Notification sent successfully",
  "data": { sentTo: 2, totalTokens: 2 }
}
```

#### 6. Send Bulk Notifications
```bash
POST /api/notifications/send-bulk

Headers:
  Authorization: Bearer ADMIN_JWT_TOKEN
  Content-Type: application/json

Body:
{
  "studentIds": ["id1", "id2", "id3"],
  "title": "Class Cancelled",
  "body": "Math class has been cancelled",
  "notificationType": "class-update"
}

Response:
{
  "success": true,
  "message": "Bulk notification sent successfully",
  "data": {
    "totalAttempted": 3,
    "results": [...]
  }
}
```

---

## 🧪 Testing with cURL

### Test 1: Register Token
```bash
curl -X POST http://localhost:5000/api/notifications/register-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "token": "ExponentPushToken[test123]",
    "deviceType": "android",
    "deviceName": "Test Device"
  }'
```

### Test 2: Send Test Notification
```bash
curl -X POST http://localhost:5000/api/notifications/send-test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Hello",
    "body": "This is a test"
  }'
```

### Test 3: Get History
```bash
curl -X GET "http://localhost:5000/api/notifications/history?limit=10&skip=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔧 Testing with Postman

1. Create Collection: "InfoCascade Notifications"
2. Set Environment Variables:
   - `base_url` = `http://localhost:5000`
   - `jwt_token` = Your JWT token
   - `student_id` = A test student ID

3. Create Requests:
   - POST /api/notifications/register-token
   - POST /api/notifications/send-test
   - GET /api/notifications/history
   - PUT /api/notifications/{notificationId}/read
   - POST /api/notifications/send-to-student (admin)
   - POST /api/notifications/send-bulk (admin)

---

## 📱 Frontend Integration

### Get Push Token (React Native/Expo)
```typescript
import * as Notifications from 'expo-notifications';

const getExpoToken = async () => {
  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
};
```

### Register Token with Backend
```typescript
const registerToken = async (token, jwtToken) => {
  const response = await fetch(
    'http://your-backend.com/api/notifications/register-token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({
        token,
        deviceType: Platform.OS,
        deviceName: 'My Device'
      })
    }
  );
  
  const data = await response.json();
  console.log('Token registered:', data.success);
};
```

### On App Launch
```typescript
useEffect(() => {
  (async () => {
    const token = await getExpoToken();
    if (token && jwtToken) {
      await registerToken(token, jwtToken);
    }
  })();
}, [jwtToken]);
```

---

## 🎯 Service Functions Reference

All functions available in `notificationService`:

```javascript
// Initialize service
initializeNotificationService()

// Get status
getServiceStatus()

// Register a token
registerToken(studentId, token, deviceType, deviceName)

// Get student tokens
getStudentTokens(studentId)

// Send to one student
sendPushToStudent(studentId, options)

// Send to multiple students
sendPushToStudents(studentIds, options)

// Send to all students
sendPushToAll(options)

// Mark as read
markNotificationAsRead(studentId, notificationId)

// Get history
getNotificationHistory(studentId, limit, skip)

// Deactivate token
deactivateToken(token)
```

---

## ❓ Common Issues & Solutions

### Issue: "EXPO_ACCESS_TOKEN not configured"
**Solution:** Add `EXPO_ACCESS_TOKEN=your_token` to `.env`

### Issue: "Invalid Expo token format"
**Solution:** Ensure token starts with `ExponentPushToken[`

### Issue: "No tokens found for student"
**Solution:** Student hasn't registered a device yet

### Issue: "Model not loaded"
**Solution:** Ensure PushToken.js and NotificationHistory.js exist in src/models/

### Issue: "Unauthorized" (401)
**Solution:** Check JWT token in Authorization header

---

## 📊 Database Collections

### PushTokens
```javascript
{
  _id: ObjectId,
  studentId: ObjectId,
  token: String,
  deviceType: String,
  deviceName: String,
  isActive: Boolean,
  lastUsedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### NotificationHistory
```javascript
{
  _id: ObjectId,
  studentId: ObjectId,
  title: String,
  body: String,
  notificationType: String,
  tokensSent: Number,
  data: Object,
  status: String,
  sentAt: Date,
  readAt: Date,
  expoTickets: Array,
  createdAt: Date,
  updatedAt: Date
}
```

---

## ✅ Verification Checklist

- [ ] `npm install expo-server-sdk` completed
- [ ] `.env` has `EXPO_ACCESS_TOKEN`
- [ ] All files created:
  - [ ] src/services/notificationService.js
  - [ ] src/controllers/notificationController.js
  - [ ] src/routes/notifications.js
  - [ ] src/models/PushToken.js
  - [ ] src/models/NotificationHistory.js
- [ ] src/routes/index.js updated
- [ ] src/index.js updated
- [ ] Server starts: `npm run dev`
- [ ] Logs show "✅ Notification service initialized"
- [ ] Can call endpoints with JWT token

---

## 🚀 Next Steps

1. **Test endpoints** with cURL or Postman
2. **Integrate with frontend** - Get token from Expo
3. **Register tokens** from mobile app
4. **Test sending notifications** from backend
5. **Add auto-send** for class reminders
6. **Deploy to production**

---

## 📚 Resources

- Expo Docs: https://docs.expo.dev/push-notifications/overview/
- Expo Access Tokens: https://expo.dev/access-tokens
- Server SDK: https://github.com/expo/expo-server-sdk-node
- API Reference: https://docs.expo.dev/push-notifications/push-api/

---

**Status:** ✅ Implementation Complete
**Date:** 2024
**Last Updated:** Today

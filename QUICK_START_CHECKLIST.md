# 🚀 Push Notifications - Quick Start Checklist

## ✅ STEP 1: Install Dependencies (5 minutes)

```bash
npm install expo-server-sdk
```

Expected output:
```
+ expo-server-sdk@3.6.0
```

**Status:** [ ] Complete

---

## ✅ STEP 2: Get Expo Access Token (10 minutes)

1. Go to: https://expo.dev/access-tokens
2. Login to your Expo account
3. Click "Create Access Token"
4. Name: "InfoCascade Push Notifications"
5. Copy the token

**Token:** `ExponentPushToken[your_token]`

**Status:** [ ] Complete

---

## ✅ STEP 3: Update .env File (5 minutes)

Add these lines to your `.env`:

```env
EXPO_ACCESS_TOKEN=ExponentPushToken[your_token_here]
JWT_SECRET=your_jwt_secret_key_here
```

**Status:** [ ] Complete

---

## ✅ STEP 4: Verify Files (2 minutes)

Check that all files exist:

```bash
# Services
ls -la src/services/notificationService.js
# ✅ Should exist

# Controllers
ls -la src/controllers/notificationController.js
# ✅ Should exist

# Routes
ls -la src/routes/notifications.js
# ✅ Should exist

# Models
ls -la src/models/PushToken.js
ls -la src/models/NotificationHistory.js
# ✅ Should exist
```

**Status:** [ ] Complete

---

## ✅ STEP 5: Start Server (2 minutes)

```bash
npm run dev
```

Expected output:
```
✅ Notification service initialized
✅ Expo client initialized
✅ All models loaded
Server running on port 5000
```

**Status:** [ ] Complete

---

## ✅ STEP 6: Test Endpoints (5 minutes)

### Test 1: Register Token

```bash
curl -X POST http://localhost:5000/api/notifications/register-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "token": "ExponentPushToken[abc123]",
    "deviceType": "android",
    "deviceName": "Test Device"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Device token registered successfully"
}
```

**Status:** [ ] Complete

### Test 2: Send Test Notification

```bash
curl -X POST http://localhost:5000/api/notifications/send-test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Test",
    "body": "Test notification"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Test notification sent successfully"
}
```

**Status:** [ ] Complete

### Test 3: Get History

```bash
curl -X GET "http://localhost:5000/api/notifications/history?limit=10&skip=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "message": "Notification history retrieved",
  "data": {
    "notifications": [],
    "pagination": { "total": 0, "limit": 10, "skip": 0, "hasMore": false }
  }
}
```

**Status:** [ ] Complete

---

## ✅ STEP 7: Test with Postman (Optional)

1. Download Postman: https://www.postman.com/downloads/
2. Create Collection: "InfoCascade Notifications"
3. Create Requests:
   - [ ] POST /api/notifications/register-token
   - [ ] POST /api/notifications/send-test
   - [ ] GET /api/notifications/history
   - [ ] PUT /api/notifications/:id/read
   - [ ] POST /api/notifications/send-to-student (admin)
   - [ ] POST /api/notifications/send-bulk (admin)

**Status:** [ ] Complete

---

## ✅ STEP 8: Frontend Integration

Get Expo push token from your mobile app and send to backend:

```typescript
// Get token
const token = await Notifications.getExpoPushTokenAsync();

// Register with backend
const response = await fetch(
  'http://your-backend.com/api/notifications/register-token',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`
    },
    body: JSON.stringify({
      token: token.data,
      deviceType: Platform.OS,
      deviceName: 'My Device'
    })
  }
);
```

**Status:** [ ] Complete

---

## ✅ STEP 9: Test End-to-End (Mobile Device)

1. [ ] Build and run app on physical Android device
2. [ ] App requests notification permission
3. [ ] Copy the push token shown in app
4. [ ] Call /api/notifications/register-token with that token
5. [ ] Call /api/notifications/send-test
6. [ ] **Notification should appear in device panel!**

**Status:** [ ] Complete

---

## ✅ STEP 10: Deploy to Production

1. [ ] Verify EXPO_ACCESS_TOKEN is set in production environment
2. [ ] Verify JWT_SECRET is strong and unique
3. [ ] Test all endpoints in production
4. [ ] Monitor logs for errors
5. [ ] Monitor notification delivery rates

**Status:** [ ] Complete

---

## 📊 Files Status

```
✅ src/models/PushToken.js
✅ src/models/NotificationHistory.js
✅ src/services/notificationService.js
✅ src/controllers/notificationController.js
✅ src/routes/notifications.js
✅ src/middleware/authMiddleware.js
✅ src/routes/index.js (updated)
✅ src/index.js (updated)
✅ PUSH_NOTIFICATIONS_IMPLEMENTATION.md (documentation)
```

---

## 📡 Available Endpoints

| Endpoint | Method | Protected | Description |
|----------|--------|-----------|-------------|
| `/api/notifications/register-token` | POST | JWT | Register device token |
| `/api/notifications/send-test` | POST | JWT | Send test notification |
| `/api/notifications/history` | GET | JWT | Get notification history |
| `/api/notifications/:id/read` | PUT | JWT | Mark as read |
| `/api/notifications/send-to-student` | POST | Admin | Send to one student |
| `/api/notifications/send-bulk` | POST | Admin | Send to multiple students |

---

## ❓ Troubleshooting

### "EXPO_ACCESS_TOKEN not configured"
→ Add EXPO_ACCESS_TOKEN to `.env`

### "Module not found: notificationService"
→ Check file exists at `src/services/notificationService.js`

### "Invalid Expo token format"
→ Token must start with `ExponentPushToken[`

### "No tokens found for student"
→ Student hasn't registered a device yet

### "Unauthorized (401)"
→ Check JWT token in Authorization header

---

## 🎯 Success Criteria

You'll know it's working when:

✅ Server starts without errors
✅ Can register token via API
✅ Can send test notification
✅ Can retrieve history
✅ Notifications appear in device panel (not just in-app toast)
✅ Can mark notifications as read

---

## 📚 Documentation

Complete documentation:
→ See `PUSH_NOTIFICATIONS_IMPLEMENTATION.md`

Quick start guide:
→ See `IMPLEMENTATION_SUMMARY.txt`

---

## 🚀 Ready to Deploy!

Once you complete all steps above, your InfoCascade backend will have:

✅ Device panel push notifications (like WhatsApp)
✅ Token management
✅ Notification history
✅ Admin bulk send
✅ Production-ready error handling

---

**Created:** 2024
**Version:** 1.0
**Status:** Ready for Testing

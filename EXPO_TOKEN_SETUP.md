# 🔑 Expo Access Token Setup Guide

## Current Status
❌ EXPO_ACCESS_TOKEN not configured in .env
✅ All backend files are ready
✅ Server is ready to start

---

## What You Need To Do (3 Steps)

### Step 1: Get Expo Access Token (5 minutes)

**Go to:** https://expo.dev/access-tokens

1. Click "Login" or create account if needed
2. You'll see your account dashboard
3. Click "Create Access Token"
4. **Name it:** `InfoCascade Push Notifications`
5. Click **"Create"**
6. **COPY** the generated token immediately

**Token looks like:**
```
ExponentPushToken[ey123abc456def789xyz...]
```

⚠️ **Important:** Copy this token carefully - you won't see it again!

---

### Step 2: Add Token to .env (2 minutes)

**Open your `.env` file** in the project root directory.

**Add this line:**
```
EXPO_ACCESS_TOKEN=ExponentPushToken[paste_your_token_here]
```

**Example:**
```
EXPO_ACCESS_TOKEN=ExponentPushToken[ey2989fdsfhsdfh89sdfhsdf]
```

**Save the file.**

---

### Step 3: Restart Server (2 minutes)

**Run:**
```bash
npm run dev
```

**You should see:**
```
✅ Notification service initialized
✅ Expo client initialized
✅ All models loaded
Server running on port 5000
```

If you see these messages, **you're all set!** 🎉

---

## Verify Setup

After adding the token, run:
```bash
bash verify-setup.sh
```

Expected output:
```
✅ EXPO_ACCESS_TOKEN found in .env
✅ Verification complete!
```

---

## Test the Endpoints

Once server is running with token, test an endpoint:

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

Expected response:
```json
{
  "success": true,
  "message": "Device token registered successfully"
}
```

---

## Troubleshooting

### "EXPO_ACCESS_TOKEN not configured"
→ Add token to .env and restart server

### "Module not found: expo-server-sdk"
→ Run: `npm install expo-server-sdk`

### "Port 5000 already in use"
→ Run: `killall node` then try again

### "Can't access https://expo.dev/access-tokens"
→ Make sure you're logged in to Expo account

---

## Security Tips

✅ **DO:**
- Keep token secret
- Use .env file
- Regenerate token if compromised
- Use different tokens for dev/prod

❌ **DON'T:**
- Share token on public chat
- Commit .env to git
- Hardcode token in code
- Use same token everywhere

---

## Next: Frontend Integration

Once backend is working:
1. Build mobile app with Expo
2. Get push token from device
3. Register token with `/api/notifications/register-token`
4. Receive push notifications!

---

## Support

- Expo Docs: https://docs.expo.dev/push-notifications/overview/
- Get More Tokens: https://expo.dev/access-tokens
- SDK Reference: https://github.com/expo/expo-server-sdk-node

---

**Total Setup Time: ~10 minutes**

Once done, you'll have production-ready push notifications! 🚀

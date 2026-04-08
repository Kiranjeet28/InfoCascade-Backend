#!/bin/bash

echo "🔍 Verifying Push Notifications Setup..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found"
    exit 1
fi

# Check if EXPO_ACCESS_TOKEN is set
if grep -q "EXPO_ACCESS_TOKEN" .env; then
    echo "✅ EXPO_ACCESS_TOKEN found in .env"
    TOKEN=$(grep "EXPO_ACCESS_TOKEN" .env | cut -d= -f2)
    if [ -z "$TOKEN" ] || [ "$TOKEN" == "your_token_here" ]; then
        echo "⚠️  Token value is empty or placeholder"
        echo "   Please add your actual Expo access token"
    else
        echo "   Token configured: ${TOKEN:0:30}..."
    fi
else
    echo "❌ EXPO_ACCESS_TOKEN not found in .env"
    echo "   Add this line to your .env:"
    echo "   EXPO_ACCESS_TOKEN=ExponentPushToken[your_token_here]"
fi

echo ""
echo "✅ Verification complete!"
echo ""
echo "Next steps:"
echo "1. If token is not set, edit .env and add EXPO_ACCESS_TOKEN"
echo "2. Run: npm run dev"
echo "3. You should see: ✅ Notification service initialized"

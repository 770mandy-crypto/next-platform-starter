#!/bin/bash

echo "🚀 FixNow - הפעלה..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 מתקין dependencies..."
    npm install
    echo ""
fi

# Check if .next exists
if [ ! -d ".next" ]; then
    echo "🔨 בונה את הפרויקט..."
    npm run build
    echo ""
fi

echo "✅ הכל מוכן!"
echo ""
echo "🌐 הפעלת השרת..."
echo ""
echo "📱 פתח בדפדפן: http://localhost:3000"
echo ""

npm start

#!/bin/bash
# Double-clicking this on macOS opens Terminal and runs it. Everything below is
# written for someone who has never used a terminal — a missing Node must read
# as an instruction, not a stack trace.

cd "$(dirname "$0")" || exit 1
clear
echo ""
echo "  ════════════════════════════════"
echo "     שוקי — אנליסט הבורסה"
echo "  ════════════════════════════════"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "  ❌ Node.js לא מותקן במחשב."
  echo ""
  echo "  זו התקנה חד-פעמית של כשתי דקות:"
  echo ""
  echo "     1. פתח:  https://nodejs.org"
  echo "     2. הורד את הגרסה שמסומנת LTS"
  echo "     3. פתח את הקובץ שהורדת ולחץ Continue עד הסוף"
  echo "     4. חזור לכאן ולחץ שוב על שוקי"
  echo ""
  echo "  ────────────────────────────────"
  read -r -p "  הקש Enter לסגירה "
  exit 1
fi

# Node 18 brought global fetch, which the data layer relies on.
MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$MAJOR" -lt 18 ]; then
  echo "  ❌ גרסת Node ישנה מדי (גרסה $MAJOR)."
  echo ""
  echo "     התקן מחדש מ- https://nodejs.org  ובחר את הגרסה המסומנת LTS."
  echo ""
  read -r -p "  הקש Enter לסגירה "
  exit 1
fi

PORT=${PORT:-4173}
echo "  ✅ מפעיל…"
echo ""

node server.mjs &
SERVER_PID=$!

# Give the listener a moment before pointing a browser at it.
sleep 1.5
if command -v open >/dev/null 2>&1; then
  open "http://localhost:$PORT"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://localhost:$PORT"
fi

# Closing the window should take the server with it.
trap 'kill $SERVER_PID 2>/dev/null' EXIT
wait $SERVER_PID

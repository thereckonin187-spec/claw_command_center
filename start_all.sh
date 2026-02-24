#!/bin/bash
# COMMAND CENTER — Start All Services
echo "☢️  COMMAND CENTER — Starting all services..."
echo ""

# Kill any existing processes
pkill -f "voice_server.py" 2>/dev/null
pkill -f "telegram_bot.py" 2>/dev/null

cd "$(dirname "$0")"

# Start voice server (TTS proxy)
if [ -f "voice_server.py" ]; then
  echo "[1/3] Starting voice server..."
  python3 voice_server.py &
  VOICE_PID=$!
  echo "      Voice server PID: $VOICE_PID"
else
  echo "[1/3] voice_server.py not found — skipping"
fi

# Start Telegram bot
if [ -f "telegram_bot.py" ]; then
  echo "[2/3] Starting Telegram bot..."
  python3 telegram_bot.py &
  BOT_PID=$!
  echo "      Telegram bot PID: $BOT_PID"
else
  echo "[2/3] telegram_bot.py not found — skipping"
fi

# Start React dev server
echo "[3/3] Starting React dev server..."
echo ""
npx react-scripts start

# Cleanup on exit
trap "kill $VOICE_PID $BOT_PID 2>/dev/null; echo 'All services stopped.'" EXIT

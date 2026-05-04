#!/usr/bin/env bash
# One-click demo launcher for Mac and Linux.
# Double-click this file (or run `bash start.sh`) and the app will
# install dependencies (first run only), start both servers, and
# open the calendar in your browser.

set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "Node.js is not installed."
  echo ""
  echo "Please install it from https://nodejs.org (pick the LTS version,"
  echo "run the installer, then come back and run this file again)."
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

echo ""
echo "==> Setting up Family Calendar (this only takes a minute the first time)..."
echo ""

if [ ! -d "backend/node_modules" ]; then
  echo "    Installing backend dependencies..."
  (cd backend && npm install --silent --no-fund --no-audit)
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "    Installing frontend dependencies..."
  (cd frontend && npm install --silent --no-fund --no-audit)
fi

# Make sure background processes get cleaned up on Ctrl-C / window close.
cleanup() {
  echo ""
  echo "Shutting down..."
  kill $(jobs -p) 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo ""
echo "==> Starting backend on http://localhost:4000"
(cd backend && npm run dev) &

# Give the backend a moment to boot before the browser hits it.
sleep 2

echo "==> Starting frontend on http://localhost:5173"
echo ""
echo "    The app should open in your browser automatically."
echo "    To stop everything, press Ctrl-C in this window."
echo ""

(cd frontend && npm run dev -- --open)

wait

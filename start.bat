@echo off
REM One-click demo launcher for Windows.
REM Double-click this file. It will install dependencies (first run
REM only), start both servers in their own windows, and open the
REM calendar in your browser.

cd /d %~dp0

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is not installed.
  echo.
  echo Please install it from https://nodejs.org (pick the LTS version,
  echo run the installer, then come back and double-click this file again).
  echo.
  pause
  exit /b 1
)

echo.
echo ==^> Setting up Family Calendar (this only takes a minute the first time)...
echo.

if not exist "backend\node_modules" (
  echo     Installing backend dependencies...
  pushd backend
  call npm install --silent --no-fund --no-audit
  popd
)

if not exist "frontend\node_modules" (
  echo     Installing frontend dependencies...
  pushd frontend
  call npm install --silent --no-fund --no-audit
  popd
)

echo.
echo ==^> Starting backend (http://localhost:4000)
start "Family Calendar - Backend" cmd /k "cd /d %~dp0backend && npm run dev"

echo     Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo ==^> Starting frontend (http://localhost:5173)
start "Family Calendar - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev -- --open"

echo.
echo Two new windows have opened (Backend and Frontend). The app
echo should open in your browser automatically.
echo.
echo To stop the app, just close those two windows.
echo.
pause

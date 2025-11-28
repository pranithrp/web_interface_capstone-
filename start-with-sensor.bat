@echo off
echo ========================================
echo   ESP8266 Sensor Integration Setup
echo ========================================
echo.

echo [Step 1] Checking MongoDB...
docker ps --filter "name=mongodb" | findstr mongodb >nul 2>&1
if errorlevel 1 (
    echo Starting MongoDB...
    docker start mongodb >nul 2>&1
    if errorlevel 1 (
        echo Creating MongoDB container...
        docker run -d --name mongodb -p 27017:27017 mongo:latest
    )
    echo ✅ MongoDB started
) else (
    echo ✅ MongoDB already running
)

echo.
echo [Step 2] Starting Node.js Server...
cd server
start "Backend Server with ESP8266 Support" cmd /k "npm start"

echo.
echo [Step 3] Waiting for server to start...
timeout /t 5 /nobreak >nul

echo.
echo [Step 4] Starting React Frontend...
cd ..\client
start "React Frontend" cmd /k "npm start"

echo.
echo ========================================
echo   All Components Started!
echo ========================================
echo.
echo Next Steps:
echo 1. Connect your ESP8266 to USB
echo 2. Find COM port in Device Manager
echo 3. Use API or frontend to connect sensor:
echo    POST http://localhost:5000/api/sensor/connect
echo    {"port": "COM3", "baudRate": 115200}
echo.
echo Endpoints:
echo - Main App: http://localhost:3000
echo - Backend: http://localhost:5000
echo - Sensor Status: http://localhost:5000/api/sensor/status
echo.
echo The browser will open automatically...
echo.
pause

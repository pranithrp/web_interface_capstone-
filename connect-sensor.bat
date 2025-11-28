@echo off
echo ========================================
echo   ESP8266 Quick Connect Script
echo ========================================
echo.
echo Your ESP8266 is on: COM5
echo.
echo Connecting to sensor...
echo.

curl -X POST http://localhost:5000/api/sensor/connect ^
  -H "Content-Type: application/json" ^
  -d "{\"port\":\"COM5\",\"baudRate\":115200}"

echo.
echo.
echo Check server console for connection status
echo.
pause

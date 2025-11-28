@echo off
echo ========================================
echo   ESP8266 Integration - Quick Test
echo ========================================
echo.

echo Step 1: Checking MongoDB...
docker ps | findstr mongodb-rpm >nul
if %errorlevel% neq 0 (
    echo [!] MongoDB not running
    echo Starting MongoDB...
    docker start mongodb-rpm
    timeout /t 3 /nobreak >nul
) else (
    echo [OK] MongoDB is running
)
echo.

echo Step 2: Testing ESP8266 connection...
echo Make sure:
echo   - ESP8266 is plugged in via USB
echo   - Arduino Serial Monitor is CLOSED
echo   - Arduino code is uploaded
echo.
pause

cd server
echo.
echo Starting detailed ESP8266 test...
echo This will show real-time data from the sensor.
echo.
echo Press Ctrl+C to stop
echo.
node test-esp8266-detailed.js

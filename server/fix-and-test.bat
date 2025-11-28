@echo off
echo.
echo ========================================
echo   ESP8266 FIX - STEP BY STEP
echo ========================================
echo.
echo PROBLEM: COM5 Access Denied
echo CAUSE: Arduino Serial Monitor is open
echo.
echo ========================================
echo   FOLLOW THESE STEPS:
echo ========================================
echo.
echo Step 1: CLOSE ARDUINO SERIAL MONITOR
echo   - Open Arduino IDE
echo   - Close Serial Monitor window
echo   - Or close Arduino IDE completely
echo.
echo Step 2: Press any key to test connection...
pause >nul

echo.
echo Testing ESP8266 connection on COM5...
echo.
node test-esp8266-detailed.js

echo.
echo ========================================
echo If you see "Access denied" above:
echo   - Arduino Serial Monitor is STILL OPEN
echo   - Close it and run this script again
echo.
echo If you see "ESP8266 CONNECTED":
echo   - SUCCESS! Now restart the server
echo   - Press Ctrl+C to stop this test
echo   - Run: node server.js
echo ========================================
echo.
pause

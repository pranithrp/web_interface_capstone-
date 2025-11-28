@echo off
echo.
echo ========================================
echo   ESP8266 COM5 TROUBLESHOOTER
echo ========================================
echo.

echo Step 1: Checking for blocking processes...
echo.

tasklist /FI "IMAGENAME eq arduino.exe" 2>NUL | find /I "arduino.exe" >NUL
if %ERRORLEVEL% EQU 0 (
    echo [!] FOUND: Arduino IDE is running!
    echo     This is likely blocking COM5
    echo.
    set /p choice="Do you want to close Arduino IDE now? (Y/N): "
    if /i "%choice%"=="Y" (
        taskkill /F /IM arduino.exe >NUL 2>&1
        echo     [OK] Arduino IDE closed
        timeout /t 2 /nobreak >NUL
    )
) else (
    echo [OK] Arduino IDE is not running
)

echo.
tasklist /FI "IMAGENAME eq java.exe" 2>NUL | find /I "java.exe" >NUL
if %ERRORLEVEL% EQU 0 (
    echo [!] WARNING: Java process found (might be Arduino)
) else (
    echo [OK] No Java processes running
)

echo.
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I "node.exe" >NUL
if %ERRORLEVEL% EQU 0 (
    echo [!] Node.js is running (might be your server)
    echo     If server is running, stop it first (Ctrl+C)
) else (
    echo [OK] Node.js is not running
)

echo.
echo ========================================
echo   Step 2: Testing COM5 Connection
echo ========================================
echo.
echo Make sure:
echo   - Arduino IDE is CLOSED
echo   - Serial Monitor is CLOSED
echo   - Server is STOPPED
echo.
pause

echo.
echo Testing connection to COM5...
echo.

node test-com5.js

echo.
echo ========================================
echo.
echo If you saw "ACCESS DENIED" above:
echo   1. Close ALL Arduino windows
echo   2. Stop your server (Ctrl+C)
echo   3. Unplug and replug ESP8266
echo   4. Run this script again
echo.
echo If you saw "SUCCESSFULLY CONNECTED":
echo   1. Perfect! COM5 is working
echo   2. Now start your server: node server.js
echo   3. Refresh your browser
echo   4. Click "Start Monitoring"
echo.
echo ========================================
echo.
pause

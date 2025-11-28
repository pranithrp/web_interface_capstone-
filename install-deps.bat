@echo off
echo Installing dependencies for Heart Rate Monitoring System...
echo.

echo 📦 Installing Backend Dependencies...
cd /d "%~dp0server"
npm install
if %errorlevel% neq 0 (
    echo ❌ Backend dependency installation failed!
    pause
    exit /b 1
)

echo.
echo 📦 Installing Frontend Dependencies...
cd /d "%~dp0client"
npm install
if %errorlevel% neq 0 (
    echo ❌ Frontend dependency installation failed!
    pause
    exit /b 1
)

echo.
echo ✅ All dependencies installed successfully!
echo 🚀 You can now run: start-all.bat
echo.
pause
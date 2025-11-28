@echo off
echo ========================================
echo   Starting Backend with MongoDB
echo ========================================
echo.

echo [Step 1] Starting MongoDB...
net start MongoDB >nul 2>&1
if errorlevel 1 (
    echo MongoDB service not found, trying manual start...
    start "MongoDB" mongod --dbpath "C:\data\db"
    timeout /t 3 /nobreak >nul
)
echo ✅ MongoDB started

echo.
echo [Step 2] Setting MongoDB connection...
set MONGODB_URI=mongodb://localhost:27017/rpm_db

echo.
echo [Step 3] Starting Node.js Backend Server...
cd server
npm start

pause
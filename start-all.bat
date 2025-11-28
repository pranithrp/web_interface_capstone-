@echo off
echo Starting Heart Rate Monitoring System with FedShield...
echo.

echo 🗄️ Checking CouchDB...
curl -s http://localhost:5984/ >nul 2>&1
if %errorlevel% neq 0 (
    echo 🚀 Starting CouchDB...
    docker run -d --name couchdb-fedshield -p 5984:5984 -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=adminpw couchdb:latest >nul 2>&1
    timeout /t 5 /nobreak > nul
)
echo ✅ CouchDB ready at http://localhost:5984/_utils

echo.
echo 🚀 Starting Backend Server (Port 5000)...
cd /d "%~dp0server"
start "Backend Server" cmd /k "npm start"

echo.
echo ⏳ Waiting 5 seconds for backend to initialize...
timeout /t 5 /nobreak > nul

echo.
echo 🌐 Starting Frontend Client (Port 3000)...
cd /d "%~dp0client"
start "Frontend Client" cmd /k "npm start"

echo.
echo ✅ All services are starting...
echo 📱 Frontend: http://localhost:3000
echo 🔧 Backend API: http://localhost:5000
echo 🗄️ CouchDB Admin: http://localhost:5984/_utils (admin/adminpw)
echo.
echo 📋 File Upload Instructions:
echo 1. Go to Patient Dashboard → Historical Files
echo 2. Upload a file - you'll see the FULL token in the panel
echo 3. View uploaded files in CouchDB at the link provided
echo.
echo Press any key to close this window...
pause > nul
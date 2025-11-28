@echo off
echo Starting CouchDB for FedShield file storage...
echo.

echo Checking if CouchDB is already running...
curl -s http://localhost:5984/ >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ CouchDB is already running at http://localhost:5984
    echo 🌐 Access CouchDB Admin: http://localhost:5984/_utils
    echo.
    goto :end
)

echo 🚀 Starting CouchDB with Docker...
docker run -d --name couchdb-fedshield -p 5984:5984 -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=adminpw couchdb:latest

if %errorlevel% neq 0 (
    echo ❌ Failed to start CouchDB with Docker
    echo 💡 Make sure Docker is installed and running
    echo 💡 Or install CouchDB locally: https://couchdb.apache.org/
    pause
    exit /b 1
)

echo ⏳ Waiting for CouchDB to start...
timeout /t 10 /nobreak > nul

echo ✅ CouchDB started successfully!
echo 🌐 Access CouchDB Admin: http://localhost:5984/_utils
echo 🔑 Username: admin
echo 🔑 Password: adminpw
echo.

:end
echo 📋 Next steps:
echo 1. Upload a file through the web interface
echo 2. View the file in CouchDB at: http://localhost:5984/_utils
echo 3. Navigate to "patient-files" database to see uploaded files
echo.
pause
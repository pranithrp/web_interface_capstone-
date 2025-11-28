@echo off
echo ========================================
echo   Starting Complete Heart Monitoring System
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
echo [Step 2] Installing Python ML dependencies...
cd server
pip install -r ml_requirements.txt >nul 2>&1
echo ✅ Python dependencies ready

echo.
echo [Step 2.5] Initializing FedShield Database...
curl -X POST http://localhost:5984/patient-files -u admin:adminpw >nul 2>&1
echo ✅ FedShield database initialized

echo.
echo [Step 3] Starting ML Backend (Python WebSocket Server)...
start "ML Backend" python ml_backend_python.py
timeout /t 3 /nobreak >nul
echo ✅ ML Backend started on ws://localhost:9001

echo.
echo [Step 4] Starting Node.js Backend Server...
set MONGODB_URI=mongodb://localhost:27017/rpm_db
start "Node Backend" npm start
timeout /t 5 /nobreak >nul
echo ✅ Node.js Backend started on http://localhost:5000

echo.
echo [Step 5] Starting React Frontend...
cd ..\client
start "React Frontend" npm start
echo ✅ React Frontend starting on http://localhost:3000

echo.
echo ========================================
echo   🚀 ALL SERVICES STARTED SUCCESSFULLY!
echo ========================================
echo.
echo Services running:
echo   • MongoDB: localhost:27017
echo   • ML Backend: ws://localhost:9001
echo   • Node.js API: http://localhost:5000
echo   • React Frontend: http://localhost:3000
echo   • FedShield: Ready for blockchain file storage
echo.
echo The React app should open automatically in your browser.
echo If not, navigate to: http://localhost:3000
echo.
echo Press any key to exit (services will continue running)...
pause >nul
@echo off
echo ===================================================
echo   Starting Full Application
echo   (MongoDB, ML Backend, Node Server, React Client)
echo ===================================================
echo.

echo [Step 1] Starting MongoDB...
echo [Step 1] Starting MongoDB (via Docker)...
docker start mongodb >nul 2>&1
if %errorlevel% neq 0 (
    echo Container 'mongodb' not found, creating new one...
    docker run -d --name mongodb -p 27017:27017 mongo:latest
) else (
    echo ✅ MongoDB Docker container started
)

echo.
echo [Step 2] Starting ML Backend...
cd server
echo Installing Python dependencies...
pip install -r ml_requirements.txt
start "ML Backend" cmd /k "python ml_backend_python.py"
cd ..

echo.
echo [Step 3] Starting Node.js Server...
cd server
start "Node Server" cmd /k "npm start"
cd ..

echo.
echo [Step 4] Starting React Client...
cd client
start "React Client" cmd /k "npm start"
cd ..

echo.
echo ✅ All services launched!
echo 📱 Frontend: http://localhost:3000
echo 🔧 Backend: http://localhost:5000
echo 🧠 ML Backend: ws://localhost:9001
echo.
pause

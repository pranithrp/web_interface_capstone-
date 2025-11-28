@echo off
echo ========================================
echo   Starting ML Backend Service
echo ========================================
echo.

echo [Step 1] Installing Python dependencies...
cd server
pip install -r ml_requirements.txt
echo ✅ Dependencies installed

echo.
echo [Step 2] Starting ML Backend WebSocket Server...
python ml_backend_python.py

pause
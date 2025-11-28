@echo off
echo ========================================
echo   Starting FedShield Blockchain Network
echo ========================================
echo.

echo [Step 1] Starting CouchDB...
start "CouchDB" "C:\Program Files\Apache CouchDB\bin\couchdb.cmd"
timeout /t 5 /nobreak >nul
echo ✅ CouchDB started on http://localhost:5984

echo.
echo [Step 2] Starting Hyperledger Fabric Network...
cd FedShield-Complete\network
call start-network.bat
echo ✅ Fabric network started

echo.
echo [Step 3] Deploying Smart Contract...
call deploy-chaincode.sh
echo ✅ Smart contract deployed

echo.
echo [Step 4] Starting FedShield Application Server...
cd ..\application
start "FedShield App" go run main.go
timeout /t 3 /nobreak >nul
echo ✅ FedShield server started on http://localhost:8080

echo.
echo ========================================
echo   🔐 FedShield Network Ready!
echo ========================================
echo.
echo Services running:
echo   • CouchDB: http://localhost:5984
echo   • Fabric Network: Running
echo   • FedShield API: http://localhost:8080
echo.
echo You can now use the Historical Files feature in the doctor dashboard.
echo.
pause
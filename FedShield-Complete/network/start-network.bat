@echo off
echo Starting FedShield Network...

REM Clean up previous runs
docker-compose down -v
docker system prune -f

REM Create channel artifacts directory
if not exist "channel-artifacts" mkdir channel-artifacts

echo Starting Docker containers...
docker-compose up -d

echo Waiting for containers to start...
timeout /t 15

echo Network started successfully!
echo CouchDB UI: http://localhost:5984/_utils (admin/adminpw)
echo File Storage CouchDB: http://localhost:5984/_utils (admin/adminpw)
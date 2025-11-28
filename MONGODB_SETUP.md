# Quick MongoDB Setup Guide

This project supports connecting to MongoDB via a local instance, Docker, or MongoDB Atlas. The server reads the connection string from the MONGODB_URI environment variable. If that variable is not set it falls back to mongodb://localhost:27017/rpm_db.

Recommended order:
- MongoDB (local) using the included installer script (Windows)
- Docker (quick, repeatable)
- MongoDB Atlas (cloud)

1) Local (Windows) - easiest for development
- Run the installer script as Administrator from the project root:
```powershell
PowerShell -ExecutionPolicy Bypass -File install-mongodb.ps1
```
- The script downloads MongoDB, extracts it under `C:\Program Files\MongoDB`, creates `C:\data\db` and installs a Windows service named `MongoDB` if possible.

2) Docker (fast, cross-platform)
```powershell
docker run -d --name mongodb -p 27017:27017 mongo:latest
```

3) MongoDB Atlas (cloud)
- Create a free cluster at https://cloud.mongodb.com and get a connection string (connection string example below).

How to configure the server
- Option A (recommended): set MONGODB_URI environment variable before starting the server. Example (PowerShell):
```powershell
$env:MONGODB_URI = "mongodb://localhost:27017/rpm_db"
node server.js
```
- Option B: use Docker or Atlas and set MONGODB_URI accordingly. Example Atlas URI (replace credentials/placeholders):
```
mongodb+srv://<username>:<password>@cluster0.abcd.mongodb.net/rpm_db?retryWrites=true&w=majority
```

Troubleshooting
- If the server logs show connection errors:
	- Ensure mongod is running (`net start MongoDB` on Windows or check Services.msc)
	- If using Docker, ensure the container is running (`docker ps`)
	- If using Atlas, ensure the IP whitelist allows your machine or use 0.0.0.0/0 for testing (not recommended for production)

Quick test
- After starting MongoDB, start the server:
```powershell
cd server
npm start
```
- You should see log output like `✅ MongoDB connected successfully` if the DB connection is established.

If you'd like, I can also add a .env example file and a small startup script that sets MONGODB_URI automatically for development.
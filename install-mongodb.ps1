# MongoDB Installation Script for Windows
Write-Host "🚀 MongoDB Installation Script" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ This script needs to run as Administrator" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

# Create MongoDB directory and version variables
$mongoVersion = "7.0.12"
$mongoBase = "C:\Program Files\MongoDB"
$mongoPath = Join-Path $mongoBase "Server\7.0\bin"
$dataPath = "C:\data\db"

Write-Host "📁 Creating MongoDB directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $dataPath | Out-Null
New-Item -ItemType Directory -Force -Path $mongoBase | Out-Null

# Download MongoDB Community Edition
$downloadUrl = "https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-$mongoVersion.zip"
$zipPath = Join-Path $env:TEMP "mongodb.zip"
$extractPath = $mongoBase

Write-Host "⬇️ Downloading MongoDB Community Edition..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray

try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing
    Write-Host "✅ Download completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Download failed: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

# Extract MongoDB
Write-Host "📦 Extracting MongoDB..." -ForegroundColor Yellow
try {
    Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

    # Try to locate the extracted folder (mongodb-*)
    $extractedFolder = Get-ChildItem -Path $extractPath -Directory | Where-Object { $_.Name -match "mongodb" } | Select-Object -First 1

    if ($extractedFolder) {
        $serverPath = Join-Path $extractPath "Server\7.0"
        if (-not (Test-Path $serverPath)) { New-Item -ItemType Directory -Force -Path $serverPath | Out-Null }

        # If extracted folder contains a 'bin' folder, move contents into Server\7.0
        $srcBin = Join-Path $extractedFolder.FullName "bin"
        if (Test-Path $srcBin) {
            Move-Item -Path (Join-Path $extractedFolder.FullName '*') -Destination $serverPath -Force
        } else {
            Move-Item -Path $extractedFolder.FullName -Destination $serverPath -Force
        }

        Write-Host "✅ MongoDB extracted successfully to $serverPath" -ForegroundColor Green

        # If bin exists under serverPath, update $mongoPath
        $binCandidate = Join-Path $serverPath "bin"
        if (Test-Path $binCandidate) { $mongoPath = $binCandidate }
    } else {
        Write-Host "⚠️ Could not locate extracted MongoDB folder. Please check $extractPath" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Extraction failed: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

# Add MongoDB to PATH (only if bin path exists)
if (Test-Path $mongoPath) {
    $currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
    if ($currentPath -notlike "*$mongoPath*") {
        Write-Host "🔧 Adding MongoDB to system PATH..." -ForegroundColor Yellow
        [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$mongoPath", "Machine")
        Write-Host "✅ MongoDB added to PATH" -ForegroundColor Green
    } else {
        Write-Host "ℹ️ MongoDB bin already in PATH" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️ MongoDB bin path not found: $mongoPath. Skipping PATH update." -ForegroundColor Yellow
}

# Create MongoDB configuration file
$configContent = @"
systemLog:
  destination: file
  path: C:\data\log\mongod.log
storage:
  dbPath: C:\data\db
net:
  port: 27017
"@

$configPath = Join-Path $mongoPath "mongod.cfg"
Write-Host "📝 Creating MongoDB configuration..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "C:\data\log" | Out-Null
$configContent | Out-File -FilePath $configPath -Encoding UTF8
Write-Host "✅ Configuration created" -ForegroundColor Green

# Install MongoDB as Windows Service
Write-Host "🔧 Installing MongoDB as Windows Service..." -ForegroundColor Yellow
try {
    & "$mongoPath\mongod.exe" --config "$configPath" --install --serviceName "MongoDB"
    Write-Host "✅ MongoDB service installed" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Service installation failed, but MongoDB can still run manually" -ForegroundColor Yellow
}

# Start MongoDB Service
Write-Host "🚀 Starting MongoDB service..." -ForegroundColor Yellow
try {
    Start-Service -Name "MongoDB" -ErrorAction SilentlyContinue
    Write-Host "✅ MongoDB service started" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Service start failed, starting MongoDB manually..." -ForegroundColor Yellow
    Start-Process -FilePath "$mongoPath\mongod.exe" -ArgumentList "--config", "$configPath" -WindowStyle Hidden
    Start-Sleep -Seconds 3
}

# Test MongoDB connection
Write-Host "🔍 Testing MongoDB connection..." -ForegroundColor Yellow
try {
    $testProcess = Start-Process -FilePath "$mongoPath\mongosh.exe" -ArgumentList "--eval", "db.runCommand({ping:1})" -PassThru -Wait -WindowStyle Hidden
    if ($testProcess.ExitCode -eq 0) {
        Write-Host "✅ MongoDB is running and accessible!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ MongoDB might not be fully ready yet" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Could not test connection, but MongoDB should be running" -ForegroundColor Yellow
}

# Cleanup
Remove-Item -Path $zipPath -Force -ErrorAction SilentlyContinue

Write-Host "`n🎉 MongoDB Installation Complete!" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green
Write-Host "MongoDB is now installed and running on port 27017" -ForegroundColor White
Write-Host "You can now restart your Node.js server" -ForegroundColor White
Write-Host "`nUseful commands:" -ForegroundColor Cyan
Write-Host "  Start MongoDB: net start MongoDB" -ForegroundColor Gray
Write-Host "  Stop MongoDB:  net stop MongoDB" -ForegroundColor Gray
Write-Host "  Connect:       mongosh" -ForegroundColor Gray

Read-Host "`nPress Enter to close"
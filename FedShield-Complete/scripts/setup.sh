#!/bin/bash

echo "🛡️ FedShield Complete Setup"
echo "=========================="

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed"
    exit 1
fi

if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Download Hyperledger Fabric binaries
echo "Downloading Hyperledger Fabric binaries..."
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.4.0 1.5.0

# Add binaries to PATH
export PATH=$PWD/bin:$PATH

echo "✅ Fabric binaries downloaded"

# Setup network
echo "Setting up Hyperledger Fabric network..."
cd ../network
chmod +x *.sh
./start-network.sh

echo "✅ Network setup complete"

# Deploy chaincode
echo "Deploying chaincode..."
./deploy-chaincode.sh

echo "✅ Chaincode deployed"

# Setup application
echo "Setting up application..."
cd ../application
go mod tidy

echo "✅ Application setup complete"

echo ""
echo "🎉 FedShield setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Start the application: cd application && go run main.go"
echo "2. Open browser: http://localhost:8080"
echo "3. CouchDB UI: http://localhost:5984/_utils (admin/adminpw)"
echo ""
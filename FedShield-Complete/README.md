# FedShield - Complete Implementation

## Architecture
- **File Storage**: CouchDB database
- **Token Management**: Hyperledger Fabric blockchain
- **Security**: Token-based access control

## Components
1. Hyperledger Fabric Network (network/)
2. Smart Contract/Chaincode (chaincode/)
3. Application Server (application/)
4. CouchDB Integration

## Setup Instructions
1. Start Fabric network: `cd network && ./start-network.sh`
2. Deploy chaincode: `./deploy-chaincode.sh`
3. Start application: `cd application && go run main.go`

## Security Model
- Files stored in CouchDB with unique tokens
- Token metadata immutably stored on blockchain
- File access requires valid blockchain token
# FedShield Deployment Guide

## Prerequisites
- Docker and Docker Compose
- Go 1.19+
- Git
- 8GB+ RAM recommended

## Quick Start

### 1. Setup Network
```bash
cd scripts
chmod +x setup.sh
./setup.sh
```

### 2. Start Application
```bash
cd application
go run main.go
```

### 3. Access Interfaces
- **Web Interface**: http://localhost:8080
- **CouchDB UI**: http://localhost:5984/_utils (admin/adminpw)

## Manual Setup

### 1. Start Hyperledger Fabric Network
```bash
cd network
chmod +x *.sh
./start-network.sh
```

### 2. Deploy Chaincode
```bash
./deploy-chaincode.sh
```

### 3. Test Network
```bash
cd ../scripts
./test-network.sh
```

### 4. Run Demo
```bash
go run demo.go
```

## Architecture Components

### Hyperledger Fabric Network
- **Orderer**: orderer.fedshield.com:7050
- **Peer**: peer0.org1.fedshield.com:7051
- **Channel**: fedshieldchannel
- **Chaincode**: filetoken

### CouchDB Databases
- **File Storage**: fedshield-files (port 5984)
- **Fabric State**: peer state database (port 7984)

### Application Server
- **Port**: 8080
- **API Endpoints**:
  - POST /upload - Upload file
  - GET /file/{token} - Retrieve file
  - GET /token/{token} - Get token info

## Security Features

1. **Token Generation**: SHA-256 hash of file content
2. **Blockchain Storage**: Immutable token metadata on Hyperledger Fabric
3. **Access Control**: Files accessible only with valid blockchain tokens
4. **Data Separation**: File content (CouchDB) and access control (Blockchain) separated
5. **Audit Trail**: All operations recorded on blockchain

## Troubleshooting

### Network Issues
```bash
# Reset network
cd network
docker-compose down -v
./start-network.sh
```

### Chaincode Issues
```bash
# Redeploy chaincode
./deploy-chaincode.sh
```

### Application Issues
```bash
# Check logs
docker logs cli
docker logs peer0.org1.fedshield.com
```

## Production Considerations

1. **TLS Configuration**: Update certificates for production
2. **Multi-org Setup**: Add additional organizations
3. **Load Balancing**: Use multiple peers
4. **Backup Strategy**: Regular CouchDB and blockchain backups
5. **Monitoring**: Implement Prometheus/Grafana monitoring
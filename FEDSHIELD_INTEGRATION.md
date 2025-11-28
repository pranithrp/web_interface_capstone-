# FedShield Blockchain Integration

## Overview
The Historical Files feature integrates FedShield blockchain technology for secure patient file storage and access control.

## Architecture
```
Doctor Dashboard → Historical Files → FedShield API → CouchDB + Blockchain
```

### Components
1. **Frontend**: `HistoricalFilesViewer.js` - React component for file management
2. **Backend**: `Routes/fedshield.js` - API endpoints for FedShield integration
3. **Storage**: CouchDB for encrypted file content
4. **Security**: Hyperledger Fabric blockchain for access tokens
5. **Encryption**: AES-256-CBC for file content encryption

## Features

### 🔐 Secure File Upload
- Files are encrypted with doctor-provided keys
- Stored in CouchDB with unique blockchain tokens
- Token metadata recorded immutably on blockchain

### 🔍 Encrypted File Access
- Doctor must provide correct encryption key
- Token validation through blockchain
- Secure file decryption and viewing

### 📁 File Management
- View all patient files
- Support for multiple file types (PDF, images, text, CSV)
- File metadata tracking (size, type, upload date)

## Usage

### 1. Access Historical Files
1. Select a patient in the doctor dashboard
2. Click "Historical Files (FedShield)" button
3. View list of encrypted patient files

### 2. Upload New File
1. In the Historical Files viewer, select a file
2. Enter an encryption key (remember this key!)
3. Click "Upload to FedShield"
4. File is encrypted and stored securely

### 3. View Encrypted File
1. Click on any file in the list
2. Enter the encryption key used during upload
3. Click "Decrypt & View"
4. File content is decrypted and displayed

## Security Model

### Encryption
- **Algorithm**: AES-256-CBC
- **Key Management**: Doctor-provided keys
- **Storage**: Encrypted content in CouchDB

### Blockchain
- **Platform**: Hyperledger Fabric
- **Smart Contract**: Token-based access control
- **Immutability**: Token metadata cannot be altered

### Access Control
- Files accessible only with correct encryption key
- Blockchain validates token authenticity
- No plaintext storage of sensitive data

## API Endpoints

### File Operations
- `POST /api/fedshield/upload-patient-file` - Upload encrypted file
- `GET /api/fedshield/patient/:id/files` - List patient files
- `POST /api/fedshield/decrypt-file` - Decrypt and retrieve file

### Token Management
- `GET /api/fedshield/token/:token/info` - Get token metadata
- `GET /api/fedshield/validate/:token` - Validate token on blockchain

### System
- `GET /api/fedshield/health` - Check service health
- `POST /api/fedshield/init-database` - Initialize CouchDB

## Setup Instructions

### Prerequisites
1. **CouchDB**: Running on localhost:5984
2. **Hyperledger Fabric**: FedShield network running
3. **Go Runtime**: For FedShield application server

### Quick Start
```bash
# Start FedShield services
start-fedshield.bat

# Initialize CouchDB
node server/init-couchdb.js

# Start main application
start-all-services.bat
```

### Manual Setup
1. **Start CouchDB**:
   ```bash
   # Windows
   "C:\Program Files\Apache CouchDB\bin\couchdb.cmd"
   
   # Access: http://localhost:5984/_utils
   # Credentials: admin/adminpw
   ```

2. **Start Fabric Network**:
   ```bash
   cd FedShield-Complete/network
   ./start-network.sh  # Linux/Mac
   start-network.bat   # Windows
   ```

3. **Deploy Smart Contract**:
   ```bash
   cd FedShield-Complete/network
   ./deploy-chaincode.sh
   ```

4. **Start FedShield App**:
   ```bash
   cd FedShield-Complete/application
   go run main.go
   ```

## File Types Supported

### Viewable in Browser
- **Text Files**: .txt, .csv, .json
- **Images**: .jpg, .png, .gif
- **Documents**: Basic text content

### Downloadable
- **PDFs**: .pdf
- **Office Documents**: .doc, .docx
- **Archives**: .zip, .rar
- **Any other file type**

## Troubleshooting

### Common Issues

1. **CouchDB Connection Failed**
   ```
   Error: connect ECONNREFUSED 127.0.0.1:5984
   ```
   - **Solution**: Start CouchDB service
   - **Check**: http://localhost:5984/_utils

2. **FedShield Server Not Running**
   ```
   Error: connect ECONNREFUSED 127.0.0.1:8080
   ```
   - **Solution**: Start FedShield application server
   - **Check**: `cd FedShield-Complete/application && go run main.go`

3. **Invalid Encryption Key**
   ```
   Error: Failed to decrypt file
   ```
   - **Solution**: Use the same key that was used during upload
   - **Note**: Keys are case-sensitive

4. **Blockchain Network Issues**
   ```
   Error: Failed to connect to gateway
   ```
   - **Solution**: Restart Fabric network
   - **Check**: Network containers are running

### Health Check
Visit `/api/fedshield/health` to check service status:
```json
{
  "status": "healthy",
  "services": {
    "fedshield": true,
    "couchdb": true,
    "blockchain": true
  }
}
```

## Security Best Practices

### For Doctors
1. **Strong Encryption Keys**: Use complex, unique keys for each file
2. **Key Management**: Store keys securely (password manager)
3. **Access Logging**: Monitor file access patterns
4. **Regular Audits**: Review stored files periodically

### For Administrators
1. **Network Security**: Secure CouchDB and Fabric network
2. **Backup Strategy**: Regular blockchain and database backups
3. **Access Control**: Limit administrative access
4. **Monitoring**: Set up alerts for unusual activity

## Development

### Adding New File Types
1. Update `HistoricalFilesViewer.js` file type detection
2. Add appropriate preview components
3. Test encryption/decryption with new formats

### Extending Blockchain Features
1. Modify smart contract in `FedShield-Complete/chaincode/`
2. Update API endpoints in `Routes/fedshield.js`
3. Deploy updated chaincode

### Custom Encryption
1. Modify encryption utilities in `Routes/fedshield.js`
2. Ensure backward compatibility
3. Update frontend decryption logic

## Support
For issues with FedShield integration:
1. Check service health endpoints
2. Review CouchDB and Fabric logs
3. Verify network connectivity
4. Test with simple file uploads first
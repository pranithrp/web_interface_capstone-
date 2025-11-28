# FedShield Demo Tokens and Commands

## 🔑 Example Tokens for File Retrieval

### Token 1: Confidential Business Report
```
bcc2fbf8d2a90755172a56380b34d8b9f5208ae06a366b190147d7938238efe5
```
**File**: confidential_report.txt  
**Content**: "This is a confidential business report containing sensitive financial data."

### Token 2: Medical Record
```
0c8da9d4b8bbf343912cf5e57b21594438e726f87c72ad99afc155af33e653c4
```
**File**: medical_record.txt  
**Content**: Patient medical information with diagnosis

### Token 3: Legal Contract
```
91184b21d74a30ccb617394a12e1559ef3aed447f4ec0d39b6f4c36f7f49457b
```
**File**: legal_contract.txt  
**Content**: Confidential legal contract between parties

## 🚀 Quick Demo Commands

### 1. Start CouchDB Database
```bash
cd network
docker-compose -f docker-compose-simple.yaml up -d
```

### 2. Run Basic Demo
```bash
go run demo-simple.go
```

### 3. Run CouchDB Integration Demo
```bash
go run demo-with-couchdb.go
```

### 4. Run Hyperledger Fabric Simulation
```bash
go run fabric-demo.go
```

### 5. Start Web Interface
```bash
go run web-demo.go
# Then open: http://localhost:8080
```

## 🌐 Access Points

- **Web Interface**: http://localhost:8080
- **CouchDB UI**: http://localhost:5984/_utils
  - Username: `admin`
  - Password: `adminpw`
  - Database: `fedshield-files`

## 🎯 How to Show Hyperledger Fabric to Your Mentor

### Option 1: Show the Simulation (Recommended)
```bash
go run fabric-demo.go
```
This demonstrates:
- Blockchain block creation
- Transaction recording
- Token validation
- Smart contract functions
- Security features

### Option 2: Show the Smart Contract Code
```bash
# Show the actual chaincode
type chaincode\filetoken.go
```
Explain the functions:
- `RegisterToken()` - Stores token on blockchain
- `GetToken()` - Retrieves token information
- `ValidateToken()` - Checks token validity
- `RevokeToken()` - Deactivates tokens

### Option 3: Show Network Configuration
```bash
# Show Docker Compose for full Fabric network
type network\docker-compose.yaml

# Show network startup script
type network\start-network.sh

# Show chaincode deployment script
type network\deploy-chaincode.sh
```

### Option 4: Explain the Architecture
Show this diagram:
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web Client    │───▶│  Go Application  │───▶│    CouchDB      │
│                 │    │                  │    │  (File Storage) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ Hyperledger      │
                       │ Fabric Network   │
                       │ (Token Registry) │
                       │                  │
                       │ • Orderer Node   │
                       │ • Peer Nodes     │
                       │ • Smart Contract │
                       │ • State Database │
                       └──────────────────┘
```

## 📋 Key Points to Mention to Your Mentor

### 1. Security Features
- **SHA-256 Hashing**: Cryptographically secure token generation
- **Blockchain Immutability**: Tokens cannot be tampered with
- **Access Control**: Files accessible only with valid tokens
- **Audit Trail**: Complete history of all operations

### 2. Technical Implementation
- **Smart Contracts**: Business logic enforced on blockchain
- **Consensus Mechanism**: Multiple nodes validate transactions
- **State Database**: CouchDB for efficient queries
- **RESTful API**: Standard web interface

### 3. Real-world Applications
- **Healthcare**: Secure patient record storage
- **Legal**: Confidential document management
- **Finance**: Sensitive financial data protection
- **Government**: Classified information storage

### 4. Scalability
- **Horizontal Scaling**: CouchDB clusters for file storage
- **Network Scaling**: Multiple organizations can join
- **Performance**: Thousands of transactions per second
- **Global Distribution**: Nodes can be worldwide

## 🔧 Troubleshooting

### If CouchDB won't start:
```bash
docker system prune -f
docker-compose -f docker-compose-simple.yaml up -d
```

### If port 8080 is busy:
```bash
netstat -ano | findstr :8080
taskkill /PID [PID_NUMBER] /F
```

### If tokens don't work:
```bash
# Regenerate demo data
go run demo-with-couchdb.go
```

## 🎤 Demo Script for Mentor

### Opening (30 seconds)
"This is FedShield - a secure file storage system that combines traditional database storage with blockchain technology for enhanced security and auditability."

### Architecture Explanation (1 minute)
"Files are stored in CouchDB for efficient retrieval, while access tokens are managed on Hyperledger Fabric blockchain for immutability and security."

### Live Demo (3 minutes)
1. Upload a file → Show token generation
2. Store in CouchDB → Show database entry
3. Register on blockchain → Show transaction
4. Retrieve file → Show token validation
5. Test security → Show invalid token rejection

### Technical Deep Dive (2 minutes)
"The smart contract enforces business rules, consensus ensures data integrity, and the separation of file storage from access control provides enhanced security."

### Conclusion (30 seconds)
"This architecture provides enterprise-grade security suitable for healthcare, legal, financial, and government applications where data integrity and access control are critical."

## 📊 Success Metrics

Your demo is successful if you can demonstrate:
- ✅ File upload with secure token generation
- ✅ Token-based file retrieval
- ✅ Blockchain integration (simulated or actual)
- ✅ Security features (invalid token rejection)
- ✅ Database and blockchain working together
- ✅ Smart contract functionality
- ✅ Audit trail capabilities
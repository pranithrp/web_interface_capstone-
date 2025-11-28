# Enhancing Security and Real-Time Analysis in RPM Devices Using Blockchain and ML Models

## Project Overview
Remote Patient Monitoring (RPM) system with real-time ESP8266 sensor integration, ML-powered health predictions, blockchain-based secure file sharing, and doctor-patient video consultations.

## Features
- **Real-time Vital Monitoring** - ESP8266 sensor for heart rate and SpO2
- **ML Predictions** - Heart condition analysis using Random Forest
- **Blockchain Security** - FedShield integration for secure medical records
- **Video Consultations** - WebRTC-based doctor-patient calls
- **Real-time Chat** - Socket.io messaging system
- **Abnormality Alerts** - Automatic detection of bradycardia, tachycardia, and invalid readings

## Technology Stack
- **Frontend**: React.js with Socket.io client
- **Backend**: Node.js, Express, Socket.io
- **Database**: MongoDB
- **ML Backend**: Python with scikit-learn
- **Hardware**: ESP8266 with MAX30102 sensor
- **Blockchain**: Hyperledger Fabric (FedShield)

## Quick Start

### Prerequisites
- Node.js (v14+)
- Python (v3.8+)
- MongoDB (Docker recommended)
- ESP8266 with MAX30102 sensor

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/pranithrp/web_interface_capstone-.git
cd web_interface_capstone-
```

2. **Install dependencies**
```bash
# Client
cd client
npm install

# Server
cd ../server
npm install
pip install -r ml_requirements.txt
```

3. **Start MongoDB**
```bash
docker run -d --name mongodb -p 27017:27017 mongo:latest
```

4. **Run the application**
```bash
# From project root
.\run_full_app.bat
```

This will start:
- MongoDB (Docker)
- ML Backend (Python WebSocket server on port 9001)
- Node.js Server (Express + Socket.io on port 5000)
- React Client (Development server on port 3000)

### Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **ML Backend**: ws://localhost:9001

## Project Structure
```
├── client/               # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   └── App.js
│   └── package.json
├── server/              # Node.js backend
│   ├── models/          # MongoDB models
│   ├── Routes/          # API routes
│   ├── services/        # Business logic
│   ├── server.js        # Main server file
│   └── ml_backend_python.py  # ML prediction service
├── run_full_app.bat     # Quick start script
└── README.md

```

## Team Members
- PES2UG22CS164
- PES2UG22CS396
- PES2UG22CS405
- PES2UG22CS550

## License
MIT License

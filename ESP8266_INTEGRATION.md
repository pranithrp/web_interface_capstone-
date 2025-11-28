# ESP8266 Sensor Integration Guide

## 📡 Overview
This integration allows you to connect your ESP8266 + MAX30102 sensor to the Remote Patient Monitoring system for real-time heart rate and SpO2 data collection and analysis.

## 🔌 Hardware Setup

### Components Needed
- ESP8266 (NodeMCU or similar)
- MAX30102 Heart Rate & SpO2 Sensor
- USB Cable

### Wiring
```
MAX30102    →    ESP8266
VIN         →    3.3V
GND         →    GND
SDA         →    D2 (GPIO4)
SCL         →    D1 (GPIO5)
```

## 💻 Software Setup

### 1. Upload Arduino Code to ESP8266

Upload the provided Arduino sketch to your ESP8266:
- Open Arduino IDE
- Install required libraries:
  - MAX30105 library
  - SparkFun MAX3010x Pulse and Proximity Sensor Library
- Select board: NodeMCU 1.0 (ESP-12E Module) or your specific ESP8266 board
- Select the correct COM port
- Upload the sketch

### 2. Install Node.js Dependencies

```powershell
cd server
npm install
```

This will install the required `serialport` package.

### 3. Find Your COM Port

After connecting ESP8266 via USB:

**Windows:**
- Open Device Manager
- Look under "Ports (COM & LPT)"
- Find "Silicon Labs CP210x" or "CH340" (e.g., COM3, COM4)

**Using the API:**
```powershell
# Start the server first
npm start

# In another terminal or browser, call:
curl http://localhost:5000/api/sensor/ports
```

## 🚀 Usage

### Method 1: Auto-Connect on Server Start

The server will automatically try to detect and connect to the ESP8266 when it starts.

### Method 2: Manual Connection via API

**List available ports:**
```bash
GET http://localhost:5000/api/sensor/ports
```

**Connect to sensor:**
```bash
POST http://localhost:5000/api/sensor/connect
Content-Type: application/json

{
  "port": "COM3",
  "baudRate": 115200
}
```

**Check sensor status:**
```bash
GET http://localhost:5000/api/sensor/status
```

**Disconnect sensor:**
```bash
POST http://localhost:5000/api/sensor/disconnect
```

### Method 3: Using the Frontend

1. Open the web application at `http://localhost:3000`
2. Go to the Patient Monitoring page
3. Click "Connect Sensor" button
4. Select your COM port from the dropdown
5. Click "Start Monitoring"

## 📊 Data Flow

```
ESP8266 Sensor
    ↓
Serial Port (115200 baud)
    ↓
Node.js Server (serialport library)
    ↓
WebSocket → ML Backend (Python)
    ↓
Prediction Results
    ↓
Socket.IO → React Frontend
    ↓
Real-time Dashboard Display
```

## 🔧 Troubleshooting

### Sensor Not Detected

1. **Check USB Connection**
   - Ensure the ESP8266 is properly connected via USB
   - Try a different USB cable or port
   - Check if the device appears in Device Manager (Windows)

2. **Check Drivers**
   - Install CH340 or CP210x drivers if needed
   - Download from: [CH340 Drivers](http://www.wch-ic.com/downloads/CH341SER_ZIP.html)

3. **Check COM Port**
   ```powershell
   # List all serial ports
   mode
   ```

### No Data Received

1. **Check Serial Monitor**
   - Open Arduino IDE Serial Monitor at 115200 baud
   - Verify data is being sent: "BPM: 75 | SpO2: 98"

2. **Check Sensor Connection**
   - Ensure MAX30102 is properly wired to ESP8266
   - Verify I2C connections (SDA, SCL)
   - Place finger correctly on sensor

3. **Check Server Logs**
   - Look for `📊 Received:` messages in the server console
   - If missing, the serial connection may not be established

### Permission Errors (Linux/Mac)

```bash
# Add your user to dialout group
sudo usermod -a -G dialout $USER
# Log out and log back in
```

## 📝 Data Format

The ESP8266 sends data in this format:
```
BPM: 75 | SpO2: 98
```

The server parses this and converts it to:
```json
{
  "heart_rate": 75,
  "spo2": 98,
  "timestamp": "2025-11-12T10:30:00.000Z",
  "data_source": "esp8266_sensor"
}
```

## 🎯 Features

- ✅ Real-time heart rate monitoring (BPM)
- ✅ Real-time SpO2 (blood oxygen) monitoring
- ✅ Automatic abnormality detection
- ✅ ML-based prediction integration
- ✅ Rolling average for stable readings
- ✅ Automatic normalization to healthy ranges
- ✅ WebSocket real-time streaming
- ✅ Fallback to CSV data if sensor unavailable

## 🔄 Switching Between Data Sources

The system automatically prioritizes data sources in this order:

1. **ESP8266 Sensor** (if connected)
2. **Python ML Backend with CSV files**
3. **Mock data** (fallback)

To switch from sensor back to CSV:
```bash
POST http://localhost:5000/api/sensor/disconnect
```

## 📈 Expected Values

### Normal Ranges (After Normalization)
- **BPM**: 60-100 bpm
- **SpO2**: 95-100%

### Alert Thresholds
- **Bradycardia**: BPM < 60
- **Tachycardia**: BPM > 100
- **Low SpO2**: SpO2 < 95%

## 💡 Tips

1. **Stable Readings**: Keep finger still on sensor for 3-5 seconds
2. **Finger Placement**: Center finger on sensor, light pressure
3. **Connection**: Keep USB cable secure during monitoring
4. **Refresh Rate**: Data updates every ~4 seconds from sensor

## 🆘 Support

If you encounter issues:
1. Check server console logs for errors
2. Verify ESP8266 is sending data (Arduino Serial Monitor)
3. Ensure correct COM port selection
4. Try disconnecting and reconnecting the sensor
5. Restart the Node.js server

---

**Ready to monitor? Connect your sensor and start the server!** 🚀

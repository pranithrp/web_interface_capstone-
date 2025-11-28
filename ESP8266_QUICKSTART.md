# 🚀 Quick Start Guide - ESP8266 Integration

## ✅ What's Been Done

I've integrated your ESP8266 + MAX30102 sensor into the Remote Patient Monitoring system! The system now:

1. ✅ Reads real-time BPM and SpO2 data from your ESP8266 via serial port
2. ✅ Sends the data to the ML backend for predictions
3. ✅ Displays results on the dashboard in real-time
4. ✅ Automatically detects abnormalities (bradycardia, tachycardia)
5. ✅ Falls back to CSV data if sensor is not connected

## 🎯 How to Run

### **Option 1: Quick Start (Recommended)**

1. **Connect your ESP8266 via USB**

2. **Start everything:**
   ```powershell
   cd "c:\Users\pranith rp\Downloads\finall\finall\web\web_interface"
   .\start-with-sensor.bat
   ```

3. **Connect to your sensor:**
   - Open browser: `http://localhost:3000`
   - The backend will auto-detect your ESP8266
   - OR use the API (see below)

### **Option 2: Manual Step-by-Step**

1. **Start MongoDB** (if not running):
   ```powershell
   docker start mongodb
   ```

2. **Start Backend Server:**
   ```powershell
   cd server
   npm start
   ```

3. **Start Frontend** (in new terminal):
   ```powershell
   cd client
   npm start
   ```

4. **Connect Sensor** (choose one method):

   **Method A - Auto Connect:**
   The server tries to auto-detect your ESP8266 on startup.

   **Method B - Via API:**
   ```powershell
   # First, find your COM port
   curl http://localhost:5000/api/sensor/ports

   # Then connect (replace COM3 with your port)
   curl -X POST http://localhost:5000/api/sensor/connect `
     -H "Content-Type: application/json" `
     -d '{"port":"COM3","baudRate":115200}'
   ```

   **Method C - Via Browser:**
   - Go to `http://localhost:3000`
   - Look for "Sensor Control" panel
   - Select your COM port
   - Click "Connect"

## 🔌 Finding Your COM Port

### Windows:
1. Open **Device Manager** (Win + X → Device Manager)
2. Expand **Ports (COM & LPT)**
3. Look for:
   - "Silicon Labs CP210x USB to UART Bridge (COM3)"
   - "USB-SERIAL CH340 (COM4)"
   - Or similar
4. Note the COM port number (e.g., COM3, COM4)

### Using Code:
```powershell
cd server
node test-sensor.js
```
This will list all available ports and test the connection.

## 🧪 Testing Your Sensor

Before running the full application, test if your sensor is working:

```powershell
cd server
node test-sensor.js COM3
```

Replace `COM3` with your actual port. You should see:
```
💓 BPM: 75 | 🩸 SpO2: 98%
💓 BPM: 76 | 🩸 SpO2: 98%
...
```

## 📊 API Endpoints

### Check Sensor Status
```bash
GET http://localhost:5000/api/sensor/status
```
Response:
```json
{
  "connected": true,
  "ready": true,
  "latestData": {
    "bpm": 75,
    "spo2": 98,
    "timestamp": "2025-11-12T10:30:00.000Z"
  }
}
```

### List Available Ports
```bash
GET http://localhost:5000/api/sensor/ports
```

### Connect to Sensor
```bash
POST http://localhost:5000/api/sensor/connect
Content-Type: application/json

{
  "port": "COM3",
  "baudRate": 115200
}
```

### Disconnect Sensor
```bash
POST http://localhost:5000/api/sensor/disconnect
```

## 🎨 How It Works

```
┌─────────────┐
│  ESP8266    │ → Reads BPM & SpO2 from MAX30102
│  + MAX30102 │    every ~4 seconds
└──────┬──────┘
       │ USB (Serial @ 115200 baud)
       ↓
┌──────────────────┐
│  Node.js Server  │ → Parses "BPM: 75 | SpO2: 98"
│  (serialport)    │    Sends to ML backend
└──────┬───────────┘
       │ WebSocket
       ↓
┌──────────────────┐
│  Python ML       │ → Makes predictions
│  Backend         │    Detects abnormalities
└──────┬───────────┘
       │ WebSocket
       ↓
┌──────────────────┐
│  React Frontend  │ → Displays real-time data
│  (Dashboard)     │    Shows predictions
└──────────────────┘
```

## 🔧 Troubleshooting

### Sensor Not Detected

**Problem:** "No serial ports found"
**Solution:**
- Check USB cable is connected
- Check ESP8266 is powered on
- Install CH340 or CP210x drivers
- Try different USB port

**Problem:** "Access denied" or "Permission error"
**Solution:**
- Close Arduino IDE Serial Monitor
- Close any other programs using the COM port
- Run as administrator (if needed)

### No Data Received

**Problem:** Sensor connected but no data
**Solution:**
1. Check ESP8266 Serial Monitor in Arduino IDE (115200 baud)
2. Verify you see: "BPM: 75 | SpO2: 98"
3. Check MAX30102 wiring
4. Place finger correctly on sensor

**Problem:** Shows "BPM: 0 | SpO2: 0"
**Solution:**
- Place finger on sensor
- Hold still for 3-5 seconds
- Ensure good contact with sensor
- Check sensor LED is glowing

### Server Errors

**Problem:** "Cannot find module 'serialport'"
**Solution:**
```powershell
cd server
npm install
```

**Problem:** MongoDB not connected
**Solution:**
```powershell
docker start mongodb
```

## 📂 Files Created/Modified

### New Files:
- `server/services/esp8266Reader.js` - ESP8266 communication service
- `server/test-sensor.js` - Sensor testing script
- `ESP8266_INTEGRATION.md` - Detailed integration guide
- `start-with-sensor.bat` - One-click startup script

### Modified Files:
- `server/server.js` - Added ESP8266 integration and API endpoints
- `server/package.json` - Added serialport dependencies

## 🎯 Next Steps

1. **Upload Arduino code** to your ESP8266 (the code you provided)
2. **Connect ESP8266** via USB
3. **Run the application** using `start-with-sensor.bat`
4. **Open browser** to `http://localhost:3000`
5. **Start monitoring** and see real-time predictions!

## 💡 Tips

- **Stable Readings:** Keep finger still on sensor
- **Finger Placement:** Center of sensor, light pressure
- **Data Rate:** Updates every ~4 seconds
- **Multiple Patients:** Currently set to patient ID 'P001' (can be customized)

## 🆘 Need Help?

1. Run the test script: `node server/test-sensor.js`
2. Check server logs for errors
3. Verify ESP8266 is sending data (Arduino Serial Monitor)
4. See `ESP8266_INTEGRATION.md` for detailed troubleshooting

---

**Everything is ready! Connect your sensor and start monitoring! 🚀**

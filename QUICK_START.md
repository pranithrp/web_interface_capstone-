# 🚀 QUICK START GUIDE - ESP8266 Integration

## Step-by-Step Instructions

### 1️⃣ Upload Arduino Code to ESP8266

1. **Open Arduino IDE**
2. **Install Libraries** (if not already installed):
   - Go to Sketch → Include Library → Manage Libraries
   - Search and install:
     - `SparkFun MAX3010x Pulse and Proximity Sensor Library`
     
3. **Select Board**:
   - Tools → Board → ESP8266 Boards → NodeMCU 1.0 (ESP-12E Module)
   
4. **Select Port**:
   - Tools → Port → COM3 (or whatever your ESP8266 shows as)
   
5. **Upload** your code ✅

### 2️⃣ Find Your COM Port

**Option A: Device Manager (Windows)**
- Press `Win + X` → Device Manager
- Expand "Ports (COM & LPT)"
- Look for "Silicon Labs CP210x" or "USB-SERIAL CH340"
- Note the COM port number (e.g., COM3)

**Option B: Arduino IDE**
- Tools → Port
- The selected port is your ESP8266

### 3️⃣ Start the Server

```powershell
# Navigate to project folder
cd "c:\Users\pranith rp\Downloads\finall\finall\web\web_interface"

# Make sure MongoDB is running
docker start mongodb

# Start the server
cd server
npm start
```

### 4️⃣ Connect the ESP8266 Sensor

**Option A: Using PowerShell/CMD**
```powershell
# Replace COM3 with your actual port
curl -X POST http://localhost:5000/api/sensor/connect `
  -H "Content-Type: application/json" `
  -d '{"port":"COM3","baudRate":115200}'
```

**Option B: Using Browser Console**
```javascript
// Open http://localhost:5000 and press F12 (Developer Tools)
fetch('http://localhost:5000/api/sensor/connect', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({port: 'COM3', baudRate: 115200})
})
.then(r => r.json())
.then(console.log);
```

### 5️⃣ Start the Frontend

```powershell
# In a NEW terminal window
cd "c:\Users\pranith rp\Downloads\finall\finall\web\web_interface\client"
npm start
```

Browser will open automatically at http://localhost:3000

### 6️⃣ Start Monitoring

1. Go to the Patient Monitoring page
2. Click "Start Monitoring"
3. You should see real-time heart rate from your ESP8266! 💓

---

## 📊 Data Flow Visualization

```
┌─────────────────┐
│  ESP8266 + MAX  │  Your Arduino sends:
│    30102 Sensor │  "BPM: 75 | SpO2: 98"
└────────┬────────┘
         │ Serial USB (115200 baud)
         ↓
┌─────────────────┐
│  Node.js Server │  Parses data and creates:
│  (serialport)   │  {heart_rate: 75, spo2: 98}
└────────┬────────┘
         │
         ├─────────────────────┐
         ↓                     ↓
┌─────────────────┐   ┌──────────────────┐
│  Python ML      │   │  React Frontend  │
│  Backend        │   │  (Socket.IO)     │
│  (WebSocket)    │   └──────────────────┘
│                 │            │
│  Predicts:      │            ↓
│  - Normal/      │   ┌──────────────────┐
│    Abnormal     │   │   Dashboard      │
│  - Confidence   │   │   📊 Charts      │
└────────┬────────┘   │   💓 Heart Rate  │
         │            │   ⚠️  Alerts     │
         └────────────→ └──────────────────┘
```

---

## 🔧 Testing Endpoints

### Check if sensor is connected:
```bash
GET http://localhost:5000/api/sensor/status

# Response:
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

### List available COM ports:
```bash
GET http://localhost:5000/api/sensor/ports

# Response:
{
  "ports": [
    {
      "path": "COM3",
      "manufacturer": "Silicon Labs",
      "serialNumber": "...",
      ...
    }
  ]
}
```

---

## ⚠️ Troubleshooting

### "Cannot find module 'serialport'"
```powershell
cd server
npm install
```

### "Port access denied" or "Port already in use"
- Close Arduino Serial Monitor
- Close any other serial terminal programs
- Disconnect and reconnect ESP8266

### No data showing in console
1. Open Arduino Serial Monitor at 115200 baud
2. Check if you see: "BPM: 75 | SpO2: 98"
3. If yes, Arduino is working - check Node.js connection
4. If no, check sensor wiring

### Server shows "Error: spawn go ENOENT"
- This is just a warning about FedShield (blockchain feature)
- You can safely ignore it
- It won't affect ESP8266 sensor functionality

---

## 🎯 What Happens Now?

1. **ESP8266 reads** heart rate & SpO2 every ~4 seconds
2. **Node.js receives** data via serial port
3. **ML Backend predicts** if values indicate normal/abnormal condition
4. **Frontend displays**:
   - Real-time heart rate chart
   - SpO2 levels
   - Prediction results
   - Alerts for abnormal values

---

## 📝 Your Arduino Code - No Changes Needed! ✅

Your current code already:
- ✅ Sends data in correct format: `"BPM: 75 | SpO2: 98"`
- ✅ Updates every 4 seconds (perfect timing)
- ✅ Normalizes values to healthy ranges
- ✅ Uses rolling averages for stability
- ✅ Detects when no finger is present

**The Node.js server handles everything else automatically!**

---

## 🎉 You're All Set!

Just follow steps 1-6 above and you'll have:
- ✅ Real-time sensor data
- ✅ ML predictions
- ✅ Beautiful dashboard
- ✅ Automatic alerts

**Let's test it now!** 🚀

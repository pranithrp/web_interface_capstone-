const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const ESP8266Reader = require("./server/services/esp8266Reader");

const app = express();
const server = http.createServer(app);

// Initialize ESP8266 sensor reader
const sensorReader = new ESP8266Reader();

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = "mongodb://localhost:27017/rpm_db";

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("✅ MongoDB connected successfully");
}).catch(err => {
  console.log("⚠️ MongoDB connection failed, continuing without database");
});

// ESP8266 Sensor Control Endpoints
app.get("/api/sensor/status", (req, res) => {
  res.json({
    connected: sensorReader.isConnected,
    ready: sensorReader.isReady(),
    latestData: sensorReader.getLatestData()
  });
});

app.get("/api/sensor/ports", async (req, res) => {
  try {
    const ports = await sensorReader.listPorts();
    res.json({ ports });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sensor/connect", async (req, res) => {
  try {
    const { port, baudRate } = req.body;
    const connected = await sensorReader.connect(port, baudRate || 115200);
    res.json({ 
      success: connected,
      message: connected ? 'Sensor connected successfully' : 'Failed to connect to sensor'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sensor/disconnect", async (req, res) => {
  try {
    await sensorReader.disconnect();
    res.json({ success: true, message: 'Sensor disconnected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.io Setup for real-time data
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("start_monitoring", () => {
    if (sensorReader.isConnected) {
      console.log('📡 Starting ESP8266 sensor monitoring');
      
      const dataHandler = (sensorData) => {
        console.log(`📡 ESP8266 Data - HR: ${sensorData.heart_rate} bpm, SpO2: ${sensorData.spo2}%`);
        
        // Detect abnormalities
        let abnormality = null;
        let status = 'normal';
        
        if (sensorData.heart_rate === 0 && sensorData.spo2 === 0) {
          abnormality = { 
            type: 'invalid_reading', 
            severity: 'critical', 
            message: '⚠️ Invalid sensor reading - Please place finger on sensor' 
          };
          status = 'critical';
        } else if (sensorData.heart_rate < 60) {
          abnormality = { 
            type: 'bradycardia', 
            severity: 'warning', 
            message: `Bradycardia: ${sensorData.heart_rate} bpm` 
          };
          status = 'warning';
        } else if (sensorData.heart_rate > 100) {
          abnormality = { 
            type: 'tachycardia', 
            severity: 'warning', 
            message: `Tachycardia: ${sensorData.heart_rate} bpm` 
          };
          status = 'warning';
        }
        
        const patientData = {
          timestamp: sensorData.timestamp,
          heart_rate: sensorData.heart_rate,
          spo2: sensorData.spo2,
          patient_id: 'P001',
          data_source: 'esp8266_sensor',
          abnormality: abnormality,
          status: status,
          confidence: 0.95
        };
        
        // Broadcast to all clients
        io.emit("patient_condition", patientData);
        console.log(`📡 Broadcasted ESP8266 data to all clients`);
      };
      
      sensorReader.on('data', dataHandler);
      socket.sensorDataHandler = dataHandler;
    } else {
      socket.emit("error", { message: "ESP8266 sensor not connected" });
    }
  });

  socket.on("stop_monitoring", () => {
    if (socket.sensorDataHandler) {
      sensorReader.removeListener('data', socket.sensorDataHandler);
      socket.sensorDataHandler = null;
    }
    console.log("⏹️ Stopped monitoring");
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (socket.sensorDataHandler) {
      sensorReader.removeListener('data', socket.sensorDataHandler);
    }
  });
});

server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('📡 ESP8266 Heart Rate Monitor Server');
  
  // Auto-connect to ESP8266 on COM12
  console.log('\n📡 Attempting to connect to ESP8266 on COM12...');
  try {
    const connected = await sensorReader.connect('COM12', 115200);
    if (connected) {
      console.log('✅ ESP8266 connected successfully on COM12');
      console.log('💓 Ready to receive heart rate data');
      console.log('\n🌐 Open http://localhost:3000 to view the dashboard');
    } else {
      console.log('⚠️ Failed to connect to ESP8266 on COM12');
      console.log('💡 You can manually connect via: POST /api/sensor/connect');
    }
  } catch (error) {
    console.log('⚠️ ESP8266 connection error:', error.message);
    console.log('💡 Make sure ESP8266 is connected and Arduino code is uploaded');
  }
});

// Cleanup on exit
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await sensorReader.disconnect();
  process.exit(0);
});
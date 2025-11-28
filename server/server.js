const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const apiRoutes = require("./Routes/api");
const fedshieldRoutes = require("./Routes/fedshield");
const fedshieldService = require("./services/fedshield");
const ESP8266Reader = require("./services/esp8266Reader");
const axios = require("axios");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const path = require("path");

// Initialize ESP8266 sensor reader
const sensorReader = new ESP8266Reader();

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Frontend URL (corrected port)
    methods: ["GET", "POST"],
  },
});

// Make io available to routes via app
app.set('io', io);

// Optional bridge for capstone-5 threat events
try {
  const initCapstoneBridge = require('./capstone_bridge');
  initCapstoneBridge(io);
} catch (err) {
  console.warn('capstone_bridge not initialized:', err.message);
}

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection with better error handling
// MongoDB Connection with env support, retry/backoff and better error handling
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/rpm_db";

const connectWithRetry = async (uri, maxRetries = 5, initialDelay = 1000) => {
  let attempt = 0;
  let delay = initialDelay;

  while (attempt < maxRetries) {
    try {
      attempt++;
      console.log(`⏳ Attempting MongoDB connection (attempt ${attempt}) to ${uri}`);
      await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      console.log("✅ MongoDB connected successfully");

      // Initialize database with sample data (only after successful connection)
      try {
        const initializeDatabase = require("./initDatabase");
        const Patient = require("./models/Patient");
        const patientCount = await Patient.countDocuments();
        if (patientCount === 0) {
          await initializeDatabase();
        }
      } catch (initErr) {
        console.error("⚠️ Error during DB initialization:", initErr);
      }

      return; // success
    } catch (err) {
      console.error(`❌ MongoDB connection attempt ${attempt} failed:`, err.message || err);
      if (attempt >= maxRetries) {
        console.error("❌ All MongoDB connection attempts failed. Database features will be disabled.");
        console.log("📝 To fix this issue:");
        console.log(" 1. Ensure MongoDB is running locally (mongod) or use Docker/Atlas");
        console.log(" 2. Example Docker: docker run -d --name mongodb -p 27017:27017 mongo:latest");
        console.log(" 3. Or provide a MONGODB_URI env var for Atlas or your remote DB");
        return;
      }

      // exponential backoff with jitter
      const jitter = Math.floor(Math.random() * 300);
      await new Promise((res) => setTimeout(res, delay + jitter));
      delay *= 2;
    }
  }
};

connectWithRetry(MONGODB_URI);

// Socket.io Setup
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Live patient monitoring feature with ML backend integration
  let monitoringInterval = null;
  let mlWebSocket = null;

  socket.on("start_monitoring", async () => {
    if (monitoringInterval || mlWebSocket) return; // Prevent multiple connections

    // Check if ESP8266 sensor is available and connected
    if (sensorReader.isConnected) {
      console.log('📡 Using ESP8266 sensor for real-time data');
      startESP8266Monitoring();
      return;
    }

    try {
      // Connect to ML backend WebSocket
      mlWebSocket = new WebSocket('ws://localhost:9001');

      mlWebSocket.onopen = () => {
        console.log('✅ Connected to Python ML backend');
        // Send a ping to verify connection
        mlWebSocket.send(JSON.stringify({
          type: 'ping'
        }));

        // Start CSV data streaming from ML backend
        mlWebSocket.send(JSON.stringify({
          type: 'start_csv_streaming'
        }));

        console.log('📊 Requested CSV data streaming from ML backend');
      };

      mlWebSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'prediction') {
            // 🚫 CSV PREDICTIONS COMPLETELY DISABLED - ONLY USE ESP8266
            console.log(`🚫 CSV prediction BLOCKED - Only ESP8266 sensor data allowed`);
            return;

            // OLD CODE (DISABLED):
            // Only forward CSV predictions if ESP8266 is NOT active
            // If ESP8266 is sending data, ignore CSV predictions
            // if (sensorReader.isConnected) {
            //   console.log(`📊 CSV prediction ignored (ESP8266 is active)`);
            //   return;
            // }

            // Forward ML prediction data to frontend with CSV source info
            // socket.emit("patient_condition", { ... });
          } else if (data.type === 'pong') {
            console.log('🏓 ML backend responded to ping');
          } else if (data.type === 'csv_streaming_started') {
            console.log('📊 CSV data streaming started (but will be ignored - ESP8266 only)');
          } else if (data.type === 'model_status') {
            console.log(`📋 Model Status: Loaded=${data.model_loaded}, CSV Files=${data.csv_files_available}`);
          }
        } catch (error) {
          console.error("Error processing ML data:", error);
        }
      };

      mlWebSocket.onerror = (error) => {
        console.error("❌ ML WebSocket error:", error);
        // Fallback to mock data
        startMockMonitoring();
      };

      mlWebSocket.onclose = () => {
        console.log("🔌 ML WebSocket disconnected");
        mlWebSocket = null;
      };

    } catch (error) {
      console.error("❌ Error connecting to ML backend:", error);
      // Fallback to mock data
      startMockMonitoring();
    }
  });

  // ESP8266 sensor monitoring function - ONLY USE ESP8266, NO CSV
  const startESP8266Monitoring = () => {
    console.log("📡 Starting ESP8266 sensor monitoring - CSV DISABLED");

    // Listen for sensor data events
    const dataHandler = async (sensorData) => {
      try {
        // ⚠️ CHANGED: NO LONGER SKIP ZERO VALUES - Send them with abnormality alert
        console.log(`📡 ESP8266 Data - HR: ${sensorData.heart_rate} bpm, SpO2: ${sensorData.spo2}%`);

        // Detect abnormalities INCLUDING zero values (invalid sensor reading)
        let abnormality = null;
        let status = 'normal';
        let condition = 'Normal';

        if (sensorData.heart_rate === 0 && sensorData.spo2 === 0) {
          abnormality = {
            type: 'invalid_reading',
            severity: 'critical',
            message: '⚠️ Invalid sensor reading - Please place finger on sensor'
          };
          status = 'critical';
          condition = 'Invalid Reading';
          console.log("🚨 ABNORMALITY: Invalid sensor reading (0 values)");
        } else if (sensorData.heart_rate < 60) {
          abnormality = {
            type: 'bradycardia',
            severity: 'warning',
            message: `Bradycardia: ${sensorData.heart_rate} bpm`
          };
          status = 'warning';
          console.log("🚨 ABNORMALITY: Bradycardia detected");
        } else if (sensorData.heart_rate > 100) {
          abnormality = {
            type: 'tachycardia',
            severity: 'warning',
            message: `Tachycardia: ${sensorData.heart_rate} bpm`
          };
          status = 'warning';
          console.log("🚨 ABNORMALITY: Tachycardia detected");
        }

        // ALWAYS send ESP8266 data directly to frontend (NEVER use CSV)
        // Broadcast to the patient room (P001) so both patient and doctor dashboards receive it
        const patientId = 'P001';
        const doctorId = 'D001';
        const room = `${patientId}-${doctorId}`;

        const patientData = {
          timestamp: sensorData.timestamp,
          heart_rate: sensorData.heart_rate,
          spo2: sensorData.spo2,
          patient_id: patientId,
          data_source: 'esp8266_sensor',  // CRITICAL: Mark as ESP8266 data
          abnormality: abnormality,
          status: status,
          condition: condition,
          confidence: 0.95 // High confidence for sensor data
        };

        // Broadcast to ALL clients in the patient room
        io.to(patientId).emit("patient_condition", patientData);
        // Also broadcast to the combined room for real-time sync
        io.to(room).emit("patient_condition", patientData);

        console.log(`📡 Broadcasted ESP8266 data to rooms: ${patientId}, ${room}`);

        // Optionally send to ML backend for advanced prediction (don't wait for response)
        if (mlWebSocket && mlWebSocket.readyState === WebSocket.OPEN) {
          mlWebSocket.send(JSON.stringify({
            type: 'predict_single',
            heart_rate: sensorData.heart_rate,
            spo2: sensorData.spo2,
            patient_id: 'P001',
            timestamp: sensorData.timestamp,
            data_source: 'esp8266_sensor'  // Tell ML backend this is from sensor
          }));
        }
      } catch (error) {
        console.error("Error processing ESP8266 data:", error);
      }
    };

    sensorReader.on('data', dataHandler);

    // Store handler for cleanup
    socket.sensorDataHandler = dataHandler;
  };

  // Fallback mock monitoring function
  const startMockMonitoring = () => {
    if (monitoringInterval) return;

    console.log("🎭 Starting mock monitoring (ML backend unavailable)");
    monitoringInterval = setInterval(() => {
      const mockHeartRate = 60 + Math.random() * 40; // 60-100 bpm range
      const abnormality = mockHeartRate < 60 ?
        { type: 'bradycardia', severity: 'warning', message: `Bradycardia: ${Math.round(mockHeartRate)} bpm` } :
        mockHeartRate > 100 ?
          { type: 'tachycardia', severity: 'warning', message: `Tachycardia: ${Math.round(mockHeartRate)} bpm` } :
          null;

      const patientId = 'P001';
      const doctorId = 'D001';
      const room = `${patientId}-${doctorId}`;

      const mockData = {
        timestamp: new Date().toISOString(),
        heart_rate: Math.round(mockHeartRate),
        patient_id: patientId,
        data_source: 'mock',
        abnormality: abnormality,
        status: abnormality ? 'warning' : 'normal'
      };

      // Broadcast to patient room
      io.to(patientId).emit("patient_condition", mockData);
      io.to(room).emit("patient_condition", mockData);
    }, 5000); // Match CSV streaming interval
  };

  socket.on("stop_monitoring", () => {
    if (mlWebSocket) {
      mlWebSocket.send(JSON.stringify({
        type: 'stop_csv_streaming'
      }));
      mlWebSocket.close();
      mlWebSocket = null;
    }

    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
    }

    // Remove ESP8266 data listener if exists
    if (socket.sensorDataHandler) {
      sensorReader.removeListener('data', socket.sensorDataHandler);
      socket.sensorDataHandler = null;
    }

    console.log("⏹️ Stopped monitoring");
  });


  // Join a room based on patient-doctor pair
  socket.on("join_chat", ({ patientId, doctorId }) => {
    const room = `${patientId}-${doctorId}`;
    socket.join(room);
    socket.join(patientId);
    socket.join(doctorId);
    console.log(`User joined room: ${room}`);
  });

  // Join doctor's individual room for receiving video call requests
  socket.on("join_doctor_room", ({ doctorId }) => {
    socket.join(doctorId);
    console.log(`Doctor ${doctorId} joined their individual room`);
  });

  // Join patient's individual room for receiving video call requests
  socket.on("join_patient_room", ({ patientId }) => {
    socket.join(patientId);
    console.log(`Patient ${patientId} joined their individual room`);
  });

  // Video call signaling events
  // Video call request
  socket.on("video_call_request", ({ to, from, role }) => {
    // to: patientId or doctorId, from: other party's id
    console.log(`Video call request from ${from} (${role}) to ${to}`);
    console.log(`Emitting to room: ${to}`);
    console.log(`Rooms for socket ${socket.id}:`, Array.from(socket.rooms));

    // Get all sockets in the target room
    const socketsInRoom = io.sockets.adapter.rooms.get(to);
    console.log(`Sockets in room ${to}:`, socketsInRoom ? Array.from(socketsInRoom) : 'No sockets');

    io.to(to).emit("video_call_request", { from, role });
  });

  // Video call accepted
  socket.on("video_call_accepted", ({ to, from, role }) => {
    io.to(to).emit("video_call_accepted", { from, role });
  });

  // Video call rejected
  socket.on("video_call_rejected", ({ to, from, role }) => {
    io.to(to).emit("video_call_rejected", { from, role });
  });

  // WebRTC offer
  socket.on("video_offer", ({ to, from, offer, role }) => {
    io.to(to).emit("video_offer", { offer, from, role });
  });

  // WebRTC answer
  socket.on("video_answer", ({ to, from, answer, role }) => {
    io.to(to).emit("video_answer", { answer, from, role });
  });

  // ICE candidate
  socket.on("video_ice_candidate", ({ to, from, candidate, role }) => {
    io.to(to).emit("video_ice_candidate", { candidate, from, role });
  });

  // End call
  socket.on("video_call_end", ({ to, from, role }) => {
    io.to(to).emit("video_call_end", { from, role });
  });

  // Handle sending messages
  socket.on("send_message", async (message) => {
    const { patientId, doctorId, sender, content } = message;
    const room = `${patientId}-${doctorId}`;

    try {
      // Try to save to MongoDB if available
      const Message = require("./models/Message");
      const newMessage = new Message({
        patientId,
        doctorId,
        sender,
        content,
      });
      await newMessage.save();

      // Broadcast to room
      io.to(room).emit("receive_message", newMessage);
    } catch (error) {
      console.error("Error saving message:", error.message);

      // Fallback: create mock message object if MongoDB fails
      const newMessage = {
        _id: Date.now().toString(),
        patientId,
        doctorId,
        sender,
        content,
        timestamp: new Date()
      };

      // Broadcast to room
      io.to(room).emit("receive_message", newMessage);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // Clean up ML WebSocket connection
    if (mlWebSocket) {
      mlWebSocket.close();
      mlWebSocket = null;
    }

    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
    }
  });
});

// Initialize FedShield service
fedshieldService.initialize().catch(err => {
  console.warn('FedShield service failed to initialize:', err.message);
});

// Routes - Define API routes BEFORE static file serving
app.use("/api", apiRoutes);
app.use("/api/fedshield", fedshieldRoutes);

// Direct upload route as fallback - FIXED
const multer = require('multer');
const crypto = require('crypto');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize global file storage
global.fileStorage = global.fileStorage || {};

app.post('/api/fedshield/upload-patient-file', upload.single('file'), (req, res) => {
  console.log('📁 File upload request received');
  console.log('Body:', req.body);
  console.log('File:', req.file ? { name: req.file.originalname, size: req.file.size } : 'No file');

  try {
    const { patientId } = req.body;
    const file = req.file;

    if (!file) {
      console.log('❌ No file provided');
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!patientId) {
      console.log('❌ No patient ID provided');
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    const token = crypto.createHash('sha256').update(file.buffer).digest('hex');

    global.fileStorage[token] = {
      content: file.buffer.toString('base64'),
      fileName: file.originalname,
      contentType: file.mimetype,
      patientId: patientId,
      fileSize: file.size,
      uploadDate: new Date()
    };

    console.log(`✅ File uploaded successfully: ${file.originalname} (Token: ${token.substring(0, 16)}...)`);

    res.json({
      success: true,
      token: token,
      message: 'File uploaded successfully',
      fileName: file.originalname
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// Direct file retrieval route
app.post('/api/fedshield/decrypt-file', (req, res) => {
  try {
    const { token } = req.body;
    const storage = global.fileStorage || {};
    const fileData = storage[token];

    if (!fileData) {
      return res.status(404).json({ error: 'File not found' });
    }

    const content = Buffer.from(fileData.content, 'base64').toString('utf8');
    res.json({
      content: content,
      fileName: fileData.fileName,
      contentType: fileData.contentType
    });
  } catch (error) {
    res.status(500).json({ error: 'Retrieval failed' });
  }
});

// Direct files list route - FIXED with debugging
app.get('/api/fedshield/patient/:patientId/files', (req, res) => {
  try {
    const { patientId } = req.params;
    console.log(`📋 [DIRECT] Fetching files for patient: ${patientId}`);

    const storage = global.fileStorage || {};
    console.log(`💾 [DIRECT] Total files in storage: ${Object.keys(storage).length}`);

    const files = Object.keys(storage)
      .filter(token => {
        const file = storage[token];
        console.log(`🔍 [DIRECT] Checking file: ${file.fileName} for patient ${file.patientId}`);
        return file.patientId === patientId;
      })
      .map(token => ({
        token: token,
        fileName: storage[token].fileName,
        fileSize: storage[token].fileSize,
        contentType: storage[token].contentType,
        timestamp: storage[token].uploadDate
      }));

    console.log(`✅ [DIRECT] Found ${files.length} files for patient ${patientId}`);
    res.json(files);
  } catch (error) {
    console.error('❌ [DIRECT] Error fetching files:', error);
    res.json([]);
  }
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

// Static file serving (for production)
app.use(express.static(path.join(__dirname, "../client/build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build/index.html"));
});

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log('🔐 FedShield blockchain integration enabled');
  console.log('📁 Secure file storage available at /api/fedshield');

  // Auto-connect to ESP8266 sensor (Auto-detect port)
  console.log('\n📡 Attempting to auto-connect to ESP8266...');
  try {
    // Pass null to trigger auto-detection in ESP8266Reader
    const connected = await sensorReader.connect();

    if (connected) {
      console.log(`✅ ESP8266 connected successfully on ${sensorReader.port.path}`);
      console.log('💓 Ready to receive real-time heart rate data');
      console.log('🌐 Open http://localhost:3000 to view the dashboard');
    } else {
      console.log('⚠️ Failed to auto-connect to ESP8266');
      console.log('💡 Troubleshooting:');
      console.log('   - Make sure ESP8266 is connected via USB');
      console.log('   - Close Arduino Serial Monitor if open');
      console.log('   - Verify Arduino code is uploaded');
      console.log('   - Check if drivers (CH340/CP210x) are installed');
    }
  } catch (error) {
    console.log('⚠️ ESP8266 connection error:', error.message);
    if (error.message.includes('Access denied')) {
      console.log('💡 TIP: Close Arduino Serial Monitor and restart server');
    }
    console.log('💡 System will use CSV data fallback if available');
  }
});

// Cleanup on exit
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await sensorReader.disconnect();
  fedshieldService.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  await sensorReader.disconnect();
  fedshieldService.cleanup();
  process.exit(0);
});
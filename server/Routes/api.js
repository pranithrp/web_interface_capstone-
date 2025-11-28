const express = require("express");
const router = express.Router();
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const Message = require("../models/Message");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

// Route to receive threat alerts from capstone modules
router.post('/threats', async (req, res) => {
  try {
    const payload = req.body;
    // Basic validation
    if (!payload || !payload.type) return res.status(400).json({ message: 'Invalid threat payload' });

    // Route to the specific patient's assigned doctor if patient_id provided
    const io = req.app.get('io');
    try {
      // Enrich payload with fields frontend expects
      const emitPayload = Object.assign({}, payload);
      // message: human readable summary
      emitPayload.message = emitPayload.message || emitPayload.reason || (emitPayload.sample && emitPayload.sample.trigger_reason) || 'Threat detected';
      // label: short label (use reason or prediction)
      emitPayload.label = emitPayload.label || emitPayload.reason || String(emitPayload.prediction || (emitPayload.sample && emitPayload.sample.prediction) || 'unknown');
      // timestamp
      emitPayload.timestamp = emitPayload.timestamp || new Date().toISOString();
      // severity
      emitPayload.severity = emitPayload.severity || (emitPayload.prediction == 1 || (emitPayload.sample && emitPayload.sample.prediction == 1) ? 'high' : 'low');

      if (payload.patient_id) {
        const patient = await Patient.findOne({ patientId: payload.patient_id });
        if (patient && patient.doctorId) {
          // Emit only to that doctor's room
          console.log(`Routing threat_alert for patient ${payload.patient_id} -> doctor ${patient.doctorId}`);
          io.to(patient.doctorId).emit('threat_alert', emitPayload);
          // Also emit to admins room
          io.to('admins').emit('threat_alert', emitPayload);
        } else {
          console.log(`Warning: patient ${payload.patient_id} or assigned doctor not found - broadcasting`);
          // Fallback broadcast if patient or doctor not found
          io.emit('threat_alert', emitPayload);
        }
      } else {
        // No patient specified - broadcast to all doctors (legacy behavior)
        const Doctor = require('../models/Doctor');
        const doctors = await Doctor.find({});
        if (!doctors || doctors.length === 0) {
          io.emit('threat_alert', payload);
        } else {
          doctors.forEach(d => {
            if (d && d.doctorId) io.to(d.doctorId).emit('threat_alert', payload);
          });
          io.to('admins').emit('threat_alert', payload);
        }
      }
    } catch (err) {
      console.error('API /threats: error routing threat:', err);
      io.emit('threat_alert', payload);
    }

    // Optionally persist to a local log file for capstone-6 to read
    const fs = require('fs');
    const path = require('path');
    const logDir = path.join(__dirname, '..', '..', 'capstone-6', 'logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, 'inbound_threats.jsonl');
    fs.appendFileSync(logPath, JSON.stringify({ timestamp: new Date().toISOString(), payload }) + '\n');

    res.json({ message: 'Threat received and broadcast' });
  } catch (err) {
    console.error('Error in /threats route:', err);
    res.status(500).json({ message: err.message });
  }
});

// Login endpoints
router.post("/login", async (req, res) => {
  try {
    const { userId, role } = req.body;
    
    if (!userId || !role) {
      return res.status(400).json({ message: "User ID and role are required" });
    }
    
    let user = null;
    
    if (role === "doctor") {
      user = await Doctor.findOne({ doctorId: userId });
    } else if (role === "patient") {
      user = await Patient.findOne({ patientId: userId });
    } else {
      return res.status(400).json({ message: "Invalid role. Must be 'doctor' or 'patient'" });
    }
    
    if (!user) {
      return res.status(404).json({ message: "User not found. Please check your ID." });
    }
    
    res.json({
      success: true,
      user: {
        id: role === "doctor" ? user.doctorId : user.patientId,
        name: user.name,
        role: role,
        ...(role === "doctor" ? { specialization: user.specialization } : { doctorId: user.doctorId, age: user.age })
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
});

// Existing routes
router.get("/patient/:id", async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientId: req.params.id });
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/doctor/:id", async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ doctorId: req.params.id });
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add this new route
router.get("/doctor/:id/patients", async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ doctorId: req.params.id });
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    // Fetch patients assigned to this doctor
    const patients = await Patient.find({ doctorId: req.params.id });
    console.log("Patients for doctor", req.params.id, ":", patients);
    res.json(patients);
  } catch (err) {
    console.error("Error fetching patients:", err);
    res.status(500).json({ message: err.message });
  }
});

router.get("/chat/:patientId/:doctorId", async (req, res) => {
  try {
    const { patientId, doctorId } = req.params;
    const messages = await Message.find({ patientId, doctorId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Heart Rate CSV Routes
// Get available heart rate files for a patient
router.get("/patient/:patientId/heart-rate-files", async (req, res) => {
  try {
    const { patientId } = req.params;
    const heartRateDir = path.join(__dirname, "../heart_rate_data");

    // Ensure directory exists
    if (!fs.existsSync(heartRateDir)) {
      fs.mkdirSync(heartRateDir, { recursive: true });
    }

    // Read all files in the directory
    const files = fs.readdirSync(heartRateDir);

    // Filter files for this patient
    const patientFiles = files
      .filter(file => file.startsWith(`${patientId}_`) && file.endsWith('.csv'))
      .map(file => {
        const parts = file.replace('.csv', '').split('_');
        const date = parts[1];
        const hour = parts[2];
        return {
          filename: file,
          date: date,
          hour: hour,
          displayName: `${date} ${hour}:00-${hour}:59`
        };
      })
      .sort((a, b) => {
        // Sort by date and hour (newest first)
        const dateTimeA = new Date(`${a.date} ${a.hour}:00:00`);
        const dateTimeB = new Date(`${b.date} ${b.hour}:00:00`);
        return dateTimeB - dateTimeA;
      });

    res.json(patientFiles);
  } catch (err) {
    console.error("Error fetching heart rate files:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get heart rate data from a specific CSV file
router.get("/patient/:patientId/heart-rate-data/:filename", async (req, res) => {
  try {
    const { patientId, filename } = req.params;
    const heartRateDir = path.join(__dirname, "../heart_rate_data");
    const filePath = path.join(heartRateDir, filename);

    // Security check: ensure filename starts with patientId
    if (!filename.startsWith(`${patientId}_`)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Heart rate file not found" });
    }

    // Read and parse CSV file
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        // Calculate statistics
        const heartRates = results.map(row => parseInt(row.heart_rate)).filter(hr => !isNaN(hr));
        const stats = {
          count: heartRates.length,
          min: Math.min(...heartRates),
          max: Math.max(...heartRates),
          average: Math.round(heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length * 100) / 100
        };

        res.json({
          filename: filename,
          data: results,
          statistics: stats
        });
      })
      .on('error', (err) => {
        console.error("Error reading CSV file:", err);
        res.status(500).json({ message: "Error reading heart rate data" });
      });
  } catch (err) {
    console.error("Error fetching heart rate data:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get current heart rate reading for a patient (cycles through CSV data)
router.get("/patient/:patientId/current-heart-rate", async (req, res) => {
  try {
    const { patientId } = req.params;
    const csvFilePath = path.join(__dirname, "../../Capstone/Updated_Preprocessed_Test.csv");

    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
      return res.status(404).json({ message: "Heart rate data file not found" });
    }

    // For performance, let's sample the file instead of loading all data
    // We'll read a smaller subset and cycle through it
    const maxSampleSize = 1000; // Limit to first 1000 valid rows for performance
    const results = [];
    let rowCount = 0;
    
    const stream = fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (data) => {
        // Stop processing after we have enough samples
        if (results.length >= maxSampleSize) {
          stream.destroy(); // Stop reading more data
          return;
        }

        // Process heart rate data if valid
        if (data.Heart_Rate && !isNaN(parseFloat(data.Heart_Rate))) {
          let heartRate = parseFloat(data.Heart_Rate);
          
          // Normalize the heart rate to realistic values (60-120 bpm range)
          // The CSV seems to contain processed/normalized values, so we need to convert them
          if (Math.abs(heartRate) > 1000) {
            // For very large values, scale them down significantly
            heartRate = 60 + (Math.abs(heartRate) % 60); // Map to 60-120 range
          } else if (Math.abs(heartRate) > 200) {
            // For moderately large values, use modulo
            heartRate = 65 + (Math.abs(heartRate) % 50); // Map to 65-115 range
          } else if (Math.abs(heartRate) < 5) {
            // For very small values, scale them up
            heartRate = 70 + (Math.abs(heartRate) * 10); // Map to 70-120 range
          } else {
            // For values in a reasonable range, normalize to 60-120
            heartRate = 60 + (Math.abs(heartRate) % 60);
          }
          
          // Ensure final value is within normal heart rate range
          heartRate = Math.max(50, Math.min(150, Math.round(heartRate)));
          
          results.push({
            heart_rate: heartRate,
            timestamp: new Date().toISOString(),
            patient_id: patientId,
            condition: data["Patient's condition"] || "0"
          });
        }
        rowCount++;
      })
      .on('end', () => {
        processResults();
      })
      .on('error', (err) => {
        console.error("Error reading CSV file:", err);
        res.status(500).json({ message: "Error reading heart rate data" });
      });

    // Handle the case where stream is destroyed early
    stream.on('close', () => {
      if (results.length > 0) {
        processResults();
      }
    });

    function processResults() {
      if (results.length === 0) {
        return res.status(404).json({ message: "No valid heart rate data found in file" });
      }

      // Calculate current index based on time (changes every 5 seconds)
      const now = Date.now();
      const interval = 5000; // 5 seconds
      const currentIndex = Math.floor((now / interval) % results.length);
      
      const currentReading = results[currentIndex];
      
      res.json({
        heart_rate: currentReading.heart_rate,
        timestamp: currentReading.timestamp,
        patient_id: currentReading.patient_id,
        condition: currentReading.condition,
        source_file: "Updated_Preprocessed_Test.csv",
        index: currentIndex,
        total_readings: results.length,
        sampled_from: rowCount
      });
    }
  } catch (err) {
    console.error("Error fetching current heart rate:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
const express = require("express");
const router = express.Router();
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const Message = require("../models/Message");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

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

module.exports = router;
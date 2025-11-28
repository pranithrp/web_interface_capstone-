const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

// Mock data for testing without MongoDB
const mockPatients = [
  {
    _id: "patient1",
    patientId: "P001",
    name: "John Doe",
    doctorId: "D001",
    vitals: [
      {
        heartRate: 72,
        bloodPressure: "120/80",
        oxygenLevel: 98,
        timestamp: new Date()
      }
    ]
  },
  {
    _id: "patient2", 
    patientId: "P002",
    name: "Jane Smith",
    doctorId: "D001",
    vitals: [
      {
        heartRate: 68,
        bloodPressure: "118/75",
        oxygenLevel: 99,
        timestamp: new Date()
      }
    ]
  },
  {
    _id: "patient3",
    patientId: "P003", 
    name: "Bob Wilson",
    doctorId: "D002",
    vitals: [
      {
        heartRate: 75,
        bloodPressure: "125/85",
        oxygenLevel: 97,
        timestamp: new Date()
      }
    ]
  }
];

const mockDoctors = [
  {
    _id: "doctor1",
    doctorId: "D001",
    name: "Dr. Sarah Johnson",
    specialization: "Cardiology"
  },
  {
    _id: "doctor2", 
    doctorId: "D002",
    name: "Dr. Michael Brown",
    specialization: "Internal Medicine"
  }
];

const mockMessages = [];

// Patient routes
router.get("/patient/:id", async (req, res) => {
  try {
    const patient = mockPatients.find(p => p.patientId === req.params.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Doctor routes
router.get("/doctor/:id", async (req, res) => {
  try {
    const doctor = mockDoctors.find(d => d.doctorId === req.params.id);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get patients for a doctor
router.get("/doctor/:id/patients", async (req, res) => {
  try {
    const doctor = mockDoctors.find(d => d.doctorId === req.params.id);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    // Find patients assigned to this doctor
    const patients = mockPatients.filter(p => p.doctorId === req.params.id);
    console.log("Patients for doctor", req.params.id, ":", patients);
    res.json(patients);
  } catch (err) {
    console.error("Error fetching patients:", err);
    res.status(500).json({ message: err.message });
  }
});

// Chat routes
router.get("/chat/:patientId/:doctorId", async (req, res) => {
  try {
    const { patientId, doctorId } = req.params;
    const messages = mockMessages.filter(m => 
      m.patientId === patientId && m.doctorId === doctorId
    ).sort((a, b) => a.timestamp - b.timestamp);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Heart rate data route
router.get("/patient/:patientId/heart-rate-data", (req, res) => {
  const { patientId } = req.params;
  const heartRateDataDir = path.join(__dirname, "../heart_rate_data");
  
  if (!fs.existsSync(heartRateDataDir)) {
    return res.status(404).json({ message: "Heart rate data directory not found" });
  }

  const files = fs.readdirSync(heartRateDataDir)
    .filter(file => file.startsWith(patientId) && file.endsWith('.csv'))
    .sort();

  if (files.length === 0) {
    return res.status(404).json({ message: "No heart rate data found for this patient" });
  }

  const allData = [];
  let filesProcessed = 0;

  files.forEach(file => {
    const filePath = path.join(heartRateDataDir, file);
    const data = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        data.push({
          timestamp: row.timestamp,
          heartRate: parseInt(row.heart_rate),
          file: file
        });
      })
      .on('end', () => {
        allData.push(...data);
        filesProcessed++;
        
        if (filesProcessed === files.length) {
          // Sort by timestamp
          allData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          res.json(allData);
        }
      })
      .on('error', (err) => {
        console.error('Error reading CSV file:', err);
        res.status(500).json({ message: 'Error reading heart rate data' });
      });
  });
});

module.exports = router;
const mongoose = require("mongoose");
const Patient = require("./models/Patient");
const Doctor = require("./models/Doctor");

const initializeDatabase = async () => {
  try {
    console.log("Initializing database with sample data...");

    // Clear existing data
    await Patient.deleteMany({});
    await Doctor.deleteMany({});

    // Create sample doctors
    const doctors = [
      {
        doctorId: "D001",
        name: "Dr. Sarah Johnson",
        specialization: "Cardiology",
        email: "sarah.johnson@hospital.com"
      },
      {
        doctorId: "D002",
        name: "Dr. Michael Brown",
        specialization: "Internal Medicine",
        email: "michael.brown@hospital.com"
      }
    ];

    await Doctor.insertMany(doctors);
    console.log("Doctors created successfully");

    // Create sample patients
    const patients = [
      {
        patientId: "P001",
        name: "John Doe",
        doctorId: "D001",
        age: 45,
        gender: "Male",
        email: "john.doe@email.com",
        phone: "+1234567890",
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
        patientId: "P002",
        name: "Jane Smith",
        doctorId: "D001",
        age: 38,
        gender: "Female",
        email: "jane.smith@email.com",
        phone: "+1234567891",
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
        patientId: "P003",
        name: "Bob Wilson",
        doctorId: "D002",
        age: 52,
        gender: "Male",
        email: "bob.wilson@email.com",
        phone: "+1234567892",
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

    await Patient.insertMany(patients);
    console.log("Patients created successfully");
    console.log("Database initialization completed!");

  } catch (error) {
    console.error("Error initializing database:", error);
  }
};

module.exports = initializeDatabase;
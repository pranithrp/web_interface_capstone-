const mongoose = require("mongoose");
const initializeDatabase = require("./initDatabase");

// Connect to MongoDB and initialize
const MONGODB_URI = "mongodb://localhost:27017/rpm_db";

async function setupDatabase() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    console.log("🔄 Initializing database with sample data...");
    await initializeDatabase();
    console.log("✅ Database setup complete!");

    // Verify data was created
    const Patient = require("./models/Patient");
    const Doctor = require("./models/Doctor");
    
    const patientCount = await Patient.countDocuments();
    const doctorCount = await Doctor.countDocuments();
    
    console.log(`📊 Created ${doctorCount} doctors and ${patientCount} patients`);
    
    // List all users for verification
    const doctors = await Doctor.find({}, 'doctorId name');
    const patients = await Patient.find({}, 'patientId name');
    
    console.log("\n👨‍⚕️ Doctors:");
    doctors.forEach(doc => console.log(`  - ${doc.doctorId}: ${doc.name}`));
    
    console.log("\n👤 Patients:");
    patients.forEach(pat => console.log(`  - ${pat.patientId}: ${pat.name}`));
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Database setup failed:", error);
    process.exit(1);
  }
}

setupDatabase();
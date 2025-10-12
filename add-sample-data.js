const mongoose = require("./server/node_modules/mongoose");

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/rpm_db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("Connected to MongoDB");
  addSampleData();
}).catch((err) => {
  console.error("MongoDB connection error:", err);
  process.exit(1);
});

// Define schemas (same as in your models)
const patientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  patientId: { type: String, required: true, unique: true },
  doctorId: { type: String },
  vitals: [
    {
      heartRate: Number,
      bloodPressure: String,
      oxygenLevel: Number,
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  doctorId: { type: String, required: true, unique: true },
  patients: [{ type: String }],
});

const Patient = mongoose.model("Patient", patientSchema);
const Doctor = mongoose.model("Doctor", doctorSchema);

async function addSampleData() {
  try {
    // Clear existing data
    await Patient.deleteMany({});
    await Doctor.deleteMany({});
    console.log("Cleared existing data");

    // Add sample doctors
    const doctors = [
      {
        name: "Dr. Alice Wilson",
        doctorId: "D001",
        patients: ["P001", "P002"]
      },
      {
        name: "Dr. Michael Brown",
        doctorId: "D002",
        patients: ["P003"]
      },
      {
        name: "Dr. Sarah Johnson",
        doctorId: "D1",
        patients: ["P12345"]
      }
    ];

    await Doctor.insertMany(doctors);
    console.log("Added sample doctors:", doctors.map(d => `${d.name} (${d.doctorId})`));

    // Add sample patients
    const patients = [
      {
        name: "John Doe",
        patientId: "P001",
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
        name: "Jane Smith",
        patientId: "P002",
        doctorId: "D001",
        vitals: [
          {
            heartRate: 68,
            bloodPressure: "115/75",
            oxygenLevel: 99,
            timestamp: new Date()
          }
        ]
      },
      {
        name: "Bob Johnson",
        patientId: "P003",
        doctorId: "D002",
        vitals: [
          {
            heartRate: 75,
            bloodPressure: "125/85",
            oxygenLevel: 97,
            timestamp: new Date()
          }
        ]
      },
      {
        name: "Test Patient",
        patientId: "P12345",
        doctorId: "D1",
        vitals: [
          {
            heartRate: 70,
            bloodPressure: "118/78",
            oxygenLevel: 98,
            timestamp: new Date()
          }
        ]
      }
    ];

    await Patient.insertMany(patients);
    console.log("Added sample patients:", patients.map(p => `${p.name} (${p.patientId})`));

    console.log("\n=== SAMPLE LOGIN CREDENTIALS ===");
    console.log("PATIENTS:");
    patients.forEach(p => {
      console.log(`  ID: ${p.patientId} | Name: ${p.name} | Doctor: ${p.doctorId}`);
    });
    
    console.log("\nDOCTORS:");
    doctors.forEach(d => {
      console.log(`  ID: ${d.doctorId} | Name: ${d.name}`);
    });

    console.log("\n✅ Sample data added successfully!");
    console.log("You can now login with any of the above IDs");
    
    process.exit(0);
  } catch (error) {
    console.error("Error adding sample data:", error);
    process.exit(1);
  }
}

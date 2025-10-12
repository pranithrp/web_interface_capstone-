const mongoose = require("mongoose");
const Patient = require("./models/Patient");

// MongoDB Connection
mongoose.connect("mongodb://localhost:27017/rpm_db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

const addMorePatients = async () => {
  try {
    // Additional patients with complete information
    const newPatients = [
      {
        name: "Alice Johnson",
        patientId: "P004",
        doctorId: "D001",
        mobileNumber: "+1-555-0987",
        currentAddress: "321 Elm Street, Rockford, IL 61101",
        lastVisitDate: new Date("2024-08-20T11:00:00Z"),
        vitals: [
          {
            heartRate: 78,
            bloodPressure: "125/82",
            oxygenLevel: 97,
            timestamp: new Date("2024-08-20T11:00:00Z")
          }
        ]
      },
      {
        name: "Michael Brown",
        patientId: "P005", 
        doctorId: "D001",
        mobileNumber: "+1-555-0654",
        currentAddress: "654 Maple Drive, Naperville, IL 60540",
        lastVisitDate: new Date("2024-08-19T16:30:00Z"),
        vitals: [
          {
            heartRate: 82,
            bloodPressure: "130/85",
            oxygenLevel: 96,
            timestamp: new Date("2024-08-19T16:30:00Z")
          }
        ]
      },
      {
        name: "Sarah Wilson",
        patientId: "P006",
        doctorId: "D002", // Different doctor
        mobileNumber: "+1-555-0321",
        currentAddress: "987 Cedar Lane, Aurora, IL 60502",
        lastVisitDate: new Date("2024-08-17T09:15:00Z"),
        vitals: [
          {
            heartRate: 75,
            bloodPressure: "118/76",
            oxygenLevel: 98,
            timestamp: new Date("2024-08-17T09:15:00Z")
          }
        ]
      }
    ];

    console.log("Adding new patients with complete information...");

    for (const patientData of newPatients) {
      // Check if patient already exists
      const existingPatient = await Patient.findOne({ patientId: patientData.patientId });
      
      if (existingPatient) {
        console.log(`⚠️  Patient ${patientData.patientId} already exists, skipping...`);
        continue;
      }

      const newPatient = new Patient(patientData);
      await newPatient.save();
      console.log(`✅ Added new patient: ${patientData.name} (${patientData.patientId})`);
    }

    console.log("\nNew patients added successfully!");
    
    // Display all patients
    const allPatients = await Patient.find({});
    console.log(`\nTotal patients in database: ${allPatients.length}`);
    
    allPatients.forEach(patient => {
      console.log(`\n- ${patient.name} (${patient.patientId})`);
      console.log(`  Doctor: ${patient.doctorId || 'Not assigned'}`);
      console.log(`  Mobile: ${patient.mobileNumber || 'Not set'}`);
      console.log(`  Address: ${patient.currentAddress || 'Not set'}`);
      console.log(`  Last Visit: ${patient.lastVisitDate ? patient.lastVisitDate.toLocaleDateString() : 'Not set'}`);
      console.log(`  Vitals: ${patient.vitals.length} readings`);
    });

  } catch (error) {
    console.error("Error adding patients:", error);
  } finally {
    mongoose.connection.close();
  }
};

addMorePatients();

const mongoose = require("mongoose");
const Patient = require("./models/Patient");

// MongoDB Connection
mongoose.connect("mongodb://localhost:27017/rpm_db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

const updatePatients = async () => {
  try {
    // Sample data for patients
    const patientUpdates = [
      {
        patientId: "P001",
        mobileNumber: "+1-555-0123",
        currentAddress: "123 Main Street, Springfield, IL 62701",
        lastVisitDate: new Date("2024-08-15T10:30:00Z")
      },
      {
        patientId: "P002", 
        mobileNumber: "+1-555-0456",
        currentAddress: "456 Oak Avenue, Chicago, IL 60601",
        lastVisitDate: new Date("2024-08-18T14:15:00Z")
      },
      {
        patientId: "P003",
        mobileNumber: "+1-555-0789",
        currentAddress: "789 Pine Road, Peoria, IL 61602",
        lastVisitDate: new Date("2024-08-12T09:45:00Z")
      }
    ];

    console.log("Updating patients with additional information...");

    for (const update of patientUpdates) {
      const result = await Patient.updateOne(
        { patientId: update.patientId },
        {
          $set: {
            mobileNumber: update.mobileNumber,
            currentAddress: update.currentAddress,
            lastVisitDate: update.lastVisitDate
          }
        }
      );
      
      if (result.matchedCount > 0) {
        console.log(`✅ Updated patient ${update.patientId}`);
      } else {
        console.log(`❌ Patient ${update.patientId} not found`);
      }
    }

    console.log("Patient update completed!");
    
    // Display updated patients
    const patients = await Patient.find({});
    console.log("\nUpdated patients:");
    patients.forEach(patient => {
      console.log(`- ${patient.name} (${patient.patientId})`);
      console.log(`  Mobile: ${patient.mobileNumber || 'Not set'}`);
      console.log(`  Address: ${patient.currentAddress || 'Not set'}`);
      console.log(`  Last Visit: ${patient.lastVisitDate ? patient.lastVisitDate.toLocaleDateString() : 'Not set'}`);
      console.log('');
    });

  } catch (error) {
    console.error("Error updating patients:", error);
  } finally {
    mongoose.connection.close();
  }
};

updatePatients();

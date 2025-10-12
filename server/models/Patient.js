const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  patientId: { type: String, required: true, unique: true },
  doctorId: { type: String }, // Must be defined here
  mobileNumber: { type: String },
  currentAddress: { type: String },
  lastVisitDate: { type: Date },
  vitals: [
    {
      heartRate: Number,
      bloodPressure: String,
      oxygenLevel: Number,
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

module.exports = mongoose.model("Patient", patientSchema);
const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  doctorId: { type: String, required: true, unique: true },
  patients: [{ type: String }], // Array of patientIds (optional)
});

module.exports = mongoose.model("Doctor", doctorSchema);
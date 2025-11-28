const mongoose = require('mongoose');

const patientFileSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  fileName: {
    type: String,
    required: true
  },
  contentType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  patientId: {
    type: String,
    required: true,
    index: true
  },
  doctorId: {
    type: String,
    required: true,
    index: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  fileType: {
    type: String,
    enum: ['medical_record', 'lab_result', 'prescription', 'image', 'report', 'other'],
    default: 'other'
  },
  description: {
    type: String,
    default: ''
  },
  accessLog: [{
    accessedBy: String,
    accessedAt: Date,
    userRole: String,
    action: String // 'view', 'download'
  }]
}, {
  timestamps: true
});

// Index for efficient queries
patientFileSchema.index({ patientId: 1, doctorId: 1 });
patientFileSchema.index({ uploadedAt: -1 });

module.exports = mongoose.model('PatientFile', patientFileSchema);
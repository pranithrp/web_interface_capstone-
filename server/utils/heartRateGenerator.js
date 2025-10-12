const fs = require('fs');
const path = require('path');

/**
 * Generate heart rate data for a specific hour
 * @param {string} patientId - Patient ID (e.g., 'P001')
 * @param {Date} date - Date object for the hour
 * @returns {Array} Array of heart rate readings
 */
function generateHeartRateData(patientId, date) {
  const data = [];
  const baseHeartRate = 70 + Math.random() * 20; // Base heart rate between 70-90
  
  for (let minute = 0; minute < 60; minute++) {
    const timestamp = new Date(date);
    timestamp.setMinutes(minute);
    timestamp.setSeconds(0);
    timestamp.setMilliseconds(0);
    
    // Generate realistic heart rate variation
    const variation = Math.sin(minute / 10) * 10 + Math.random() * 10 - 5;
    const heartRate = Math.round(Math.max(50, Math.min(120, baseHeartRate + variation)));
    
    data.push({
      timestamp: timestamp.toISOString().replace('T', ' ').substring(0, 19),
      heart_rate: heartRate,
      patient_id: patientId
    });
  }
  
  return data;
}

/**
 * Save heart rate data to CSV file
 * @param {string} patientId - Patient ID
 * @param {Date} date - Date object for the hour
 * @param {Array} data - Heart rate data array
 */
function saveHeartRateCSV(patientId, date, data) {
  const heartRateDir = path.join(__dirname, '../heart_rate_data');
  
  // Ensure directory exists
  if (!fs.existsSync(heartRateDir)) {
    fs.mkdirSync(heartRateDir, { recursive: true });
  }
  
  // Generate filename: PatientID_YYYY-MM-DD_HH.csv
  const dateStr = date.toISOString().substring(0, 10); // YYYY-MM-DD
  const hour = date.getHours().toString().padStart(2, '0');
  const filename = `${patientId}_${dateStr}_${hour}.csv`;
  const filePath = path.join(heartRateDir, filename);
  
  // Create CSV content
  let csvContent = 'timestamp,heart_rate,patient_id\n';
  data.forEach(row => {
    csvContent += `${row.timestamp},${row.heart_rate},${row.patient_id}\n`;
  });
  
  // Write file
  fs.writeFileSync(filePath, csvContent);
  console.log(`Heart rate CSV file created: ${filename}`);
  
  return filename;
}

/**
 * Generate and save heart rate data for a specific hour
 * @param {string} patientId - Patient ID
 * @param {Date} date - Date object for the hour
 * @returns {string} Generated filename
 */
function generateHeartRateFile(patientId, date) {
  const data = generateHeartRateData(patientId, date);
  return saveHeartRateCSV(patientId, date, data);
}

/**
 * Generate heart rate files for multiple hours
 * @param {string} patientId - Patient ID
 * @param {Date} startDate - Start date
 * @param {number} hours - Number of hours to generate
 */
function generateMultipleHeartRateFiles(patientId, startDate, hours) {
  const filenames = [];
  
  for (let i = 0; i < hours; i++) {
    const date = new Date(startDate);
    date.setHours(startDate.getHours() + i);
    
    const filename = generateHeartRateFile(patientId, date);
    filenames.push(filename);
  }
  
  console.log(`Generated ${hours} heart rate files for patient ${patientId}`);
  return filenames;
}

module.exports = {
  generateHeartRateData,
  saveHeartRateCSV,
  generateHeartRateFile,
  generateMultipleHeartRateFiles
};

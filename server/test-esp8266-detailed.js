// Test ESP8266 Reader Functionality
const ESP8266Reader = require('./services/esp8266Reader');

console.log('🔍 Testing ESP8266 Reader...\n');

const reader = new ESP8266Reader();

// Listen for data events
reader.on('data', (data) => {
  console.log('✅ ESP8266 DATA RECEIVED:');
  console.log('   BPM:', data.bpm);
  console.log('   SpO2:', data.spo2);
  console.log('   Timestamp:', new Date().toLocaleTimeString());
  
  if (data.bpm === 0 && data.spo2 === 0) {
    console.log('   ⚠️  Zero values detected - Finger not on sensor');
  } else {
    console.log('   ✓ Valid readings');
  }
  console.log('');
});

// Listen for connection events
reader.on('connected', (port) => {
  console.log(`✅ ESP8266 CONNECTED on port: ${port}`);
  console.log('   Waiting for data...\n');
});

// Listen for disconnection events
reader.on('disconnected', () => {
  console.log('❌ ESP8266 DISCONNECTED');
});

// Listen for error events
reader.on('error', (error) => {
  console.error('❌ ESP8266 ERROR:', error.message);
});

// Auto-detect and connect
console.log('🔎 Auto-detecting ESP8266 on available COM ports...\n');

reader.autoDetectPort()
  .then(port => {
    console.log(`✅ Found ESP8266 on: ${port}`);
    console.log('🔌 Connecting...\n');
    return reader.connect(port, 115200);
  })
  .catch(error => {
    console.error('❌ Auto-detection failed:', error.message);
    console.log('\n💡 Available options:');
    console.log('   1. Make sure ESP8266 is plugged in via USB');
    console.log('   2. Close Arduino Serial Monitor if open');
    console.log('   3. Check if correct Arduino code is uploaded');
    console.log('   4. Try manually: reader.connect("COM5", 115200)');
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down...');
  reader.disconnect();
  process.exit(0);
});

console.log('💡 Press Ctrl+C to stop\n');
console.log('━'.repeat(60));

// ESP8266 Sensor Connection Test Script
// Run this to test your sensor connection before starting the main server

const ESP8266Reader = require('./services/esp8266Reader');

async function testSensor() {
  console.log('🧪 ESP8266 Sensor Test Script');
  console.log('================================\n');

  const reader = new ESP8266Reader();

  // List available ports
  console.log('📡 Step 1: Listing available serial ports...\n');
  const ports = await reader.listPorts();
  
  if (ports.length === 0) {
    console.log('❌ No serial ports found!');
    console.log('💡 Please connect your ESP8266 via USB and try again.\n');
    process.exit(1);
  }

  console.log('\n📍 Found', ports.length, 'port(s)\n');

  // Get COM port from command line or auto-detect
  let portPath = process.argv[2];
  
  if (!portPath) {
    console.log('🔍 No port specified, attempting auto-detection...\n');
    portPath = await reader.autoDetectPort();
    
    if (!portPath) {
      console.log('❌ Could not auto-detect ESP8266!');
      console.log('\n💡 Usage: node test-sensor.js COM3');
      console.log('\nAvailable ports:');
      ports.forEach((port, i) => {
        console.log(`  ${i + 1}. ${port.path}`);
      });
      process.exit(1);
    }
  }

  console.log(`🔌 Step 2: Connecting to ${portPath}...\n`);

  // Connect to sensor
  const connected = await reader.connect(portPath, 115200);

  if (!connected) {
    console.log('❌ Failed to connect to sensor!');
    process.exit(1);
  }

  console.log('✅ Connected successfully!\n');
  console.log('📊 Step 3: Listening for sensor data...');
  console.log('💡 Place your finger on the sensor and hold still...\n');
  console.log('Press Ctrl+C to exit\n');
  console.log('─'.repeat(50));

  // Listen for data
  let dataCount = 0;
  reader.on('data', (data) => {
    dataCount++;
    console.log(`[${dataCount}] 💓 BPM: ${data.heart_rate} | 🩸 SpO2: ${data.spo2}%`);
    
    if (data.heart_rate === 0) {
      console.log('    ⚠️  No finger detected or reading in progress...');
    }
  });

  reader.on('error', (error) => {
    console.error('❌ Sensor error:', error.message);
  });

  reader.on('disconnected', () => {
    console.log('\n🔌 Sensor disconnected');
    process.exit(0);
  });

  // Cleanup on exit
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Stopping test...');
    await reader.disconnect();
    console.log('✅ Test complete!');
    process.exit(0);
  });
}

// Run the test
testSensor().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});

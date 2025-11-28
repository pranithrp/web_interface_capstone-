const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

console.log('🔍 ESP8266 Sensor Connection Tester\n');

// List all available ports
async function listPorts() {
  try {
    const ports = await SerialPort.list();
    console.log('📡 Available Serial Ports:\n');
    
    if (ports.length === 0) {
      console.log('❌ No serial ports found!');
      console.log('   Please connect your ESP8266 via USB.\n');
      return null;
    }
    
    ports.forEach((port, index) => {
      console.log(`${index + 1}. ${port.path}`);
      console.log(`   Manufacturer: ${port.manufacturer || 'Unknown'}`);
      console.log(`   Serial Number: ${port.serialNumber || 'N/A'}`);
      console.log('');
    });
    
    // Try to auto-detect ESP8266
    const esp8266Port = ports.find(port => 
      port.manufacturer?.toLowerCase().includes('silicon labs') ||
      port.manufacturer?.toLowerCase().includes('ch340') ||
      port.manufacturer?.toLowerCase().includes('cp210') ||
      port.path.includes('USB')
    );
    
    if (esp8266Port) {
      console.log(`✅ Likely ESP8266 detected: ${esp8266Port.path}\n`);
      return esp8266Port.path;
    }
    
    return ports[0].path;
    
  } catch (error) {
    console.error('❌ Error listing ports:', error.message);
    return null;
  }
}

// Test connection to a specific port
async function testPort(portPath) {
  return new Promise((resolve) => {
    console.log(`🔌 Attempting to connect to ${portPath} at 115200 baud...\n`);
    
    const port = new SerialPort({
      path: portPath,
      baudRate: 115200,
      autoOpen: false
    });
    
    const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
    
    let dataReceived = false;
    let timeout;
    
    parser.on('data', (line) => {
      dataReceived = true;
      console.log(`📊 Received: ${line}`);
      
      // Check if it's the expected format
      if (line.includes('BPM:') && line.includes('SpO2:')) {
        console.log('✅ Valid sensor data format detected!\n');
      }
    });
    
    port.on('error', (err) => {
      console.error(`❌ Error: ${err.message}\n`);
      clearTimeout(timeout);
      port.close();
      resolve(false);
    });
    
    port.open((err) => {
      if (err) {
        console.error(`❌ Failed to open port: ${err.message}\n`);
        resolve(false);
        return;
      }
      
      console.log('✅ Port opened successfully!');
      console.log('📡 Listening for data (waiting 15 seconds)...\n');
      
      // Wait for 15 seconds to receive data
      timeout = setTimeout(() => {
        if (dataReceived) {
          console.log('\n✅ SUCCESS! ESP8266 is sending data correctly.');
          console.log('🎉 Your sensor is ready to use with the server!\n');
          console.log('Next steps:');
          console.log('1. Start the server: npm start');
          console.log('2. Connect sensor via API:');
          console.log(`   POST http://localhost:5000/api/sensor/connect`);
          console.log(`   {"port": "${portPath}", "baudRate": 115200}`);
        } else {
          console.log('\n⚠️  No data received from ESP8266.');
          console.log('Troubleshooting:');
          console.log('1. Check if Arduino code is uploaded');
          console.log('2. Verify sensor wiring (SDA, SCL, VCC, GND)');
          console.log('3. Place finger on MAX30102 sensor');
          console.log('4. Try opening Arduino Serial Monitor to verify output');
        }
        
        port.close(() => {
          resolve(dataReceived);
        });
      }, 15000);
    });
  });
}

// Main function
async function main() {
  // Get command line argument for port
  const argPort = process.argv[2];
  
  if (argPort) {
    // Test specific port
    await testPort(argPort);
  } else {
    // Auto-detect and test
    const detectedPort = await listPorts();
    
    if (detectedPort) {
      console.log(`Testing port: ${detectedPort}`);
      console.log('(Press Ctrl+C to cancel)\n');
      await testPort(detectedPort);
    } else {
      console.log('Usage: node test-esp8266.js [COM_PORT]');
      console.log('Example: node test-esp8266.js COM3');
    }
  }
  
  process.exit(0);
}

main();

// Test connection to specific COM port
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const portPath = 'COM5';
const baudRate = 115200;

console.log(`🔌 Testing connection to ${portPath} @ ${baudRate} baud...`);
console.log('💡 Make sure Arduino Serial Monitor is CLOSED!\n');

const port = new SerialPort({
  path: portPath,
  baudRate: baudRate,
  autoOpen: false
});

const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

port.on('error', (err) => {
  console.error('❌ ERROR:', err.message);
  
  if (err.message.includes('Access denied')) {
    console.log('\n⚠️  ACCESS DENIED - COM5 is being used by another program!');
    console.log('\n💡 SOLUTIONS:');
    console.log('   1. Close Arduino Serial Monitor');
    console.log('   2. Close any other serial terminal programs');
    console.log('   3. Unplug and replug the ESP8266');
    console.log('   4. Restart your computer (last resort)');
  }
  process.exit(1);
});

port.on('open', () => {
  console.log(`✅ SUCCESSFULLY CONNECTED to ${portPath}!`);
  console.log('📊 Waiting for data from ESP8266...');
  console.log('💡 Place your finger on the MAX30102 sensor\n');
  console.log('━'.repeat(60));
});

port.on('close', () => {
  console.log('\n🔌 Port disconnected');
  process.exit(0);
});

let dataCount = 0;

parser.on('data', (line) => {
  line = line.trim();
  
  // Skip empty lines
  if (!line) return;
  
  dataCount++;
  
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] RAW: ${line}`);
  
  // Parse BPM and SpO2
  const bpmMatch = line.match(/BPM:\s*(\d+)/i);
  const spo2Match = line.match(/SpO2:\s*(\d+)/i);
  
  if (bpmMatch && spo2Match) {
    const bpm = parseInt(bpmMatch[1]);
    const spo2 = parseInt(spo2Match[1]);
    
    console.log(`   ❤️  BPM: ${bpm} | 🫁 SpO2: ${spo2}%`);
    
    if (bpm === 0 && spo2 === 0) {
      console.log('   ⚠️  No finger detected!\n');
    } else {
      console.log('   ✅ Valid reading!\n');
    }
  }
  
  if (dataCount >= 10) {
    console.log('━'.repeat(60));
    console.log(`\n✅ SUCCESS! Received ${dataCount} readings from ESP8266`);
    console.log('💡 COM5 is working correctly!');
    console.log('💡 Now restart your server to use this port\n');
    process.exit(0);
  }
});

// Open the port
port.open((err) => {
  if (err) {
    console.error('❌ Failed to open port:', err.message);
    
    if (err.message.includes('Access denied')) {
      console.log('\n⚠️  ACCESS DENIED!');
      console.log('💡 Another program is using COM5');
      console.log('💡 Close Arduino Serial Monitor and try again');
    }
    process.exit(1);
  }
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log('\n⏱️  Timeout - No data received in 30 seconds');
  console.log('💡 Check if Arduino code is running');
  console.log('💡 Verify correct code is uploaded to ESP8266');
  port.close();
}, 30000);

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n🛑 Test stopped by user');
  port.close();
});

console.log('Press Ctrl+C to stop...\n');

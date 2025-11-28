// Quick script to list all available COM ports
const { SerialPort } = require('serialport');

console.log('🔍 Scanning for all available COM ports...\n');

SerialPort.list().then(ports => {
  if (ports.length === 0) {
    console.log('❌ No COM ports found!');
    console.log('💡 Make sure ESP8266 is plugged in via USB\n');
    return;
  }

  console.log(`✅ Found ${ports.length} COM port(s):\n`);
  
  ports.forEach((port, index) => {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Port ${index + 1}:`);
    console.log(`  Path: ${port.path}`);
    console.log(`  Manufacturer: ${port.manufacturer || 'Unknown'}`);
    console.log(`  Serial Number: ${port.serialNumber || 'N/A'}`);
    console.log(`  Product ID: ${port.productId || 'N/A'}`);
    console.log(`  Vendor ID: ${port.vendorId || 'N/A'}`);
    
    // Check if it's likely an ESP8266
    const isESP8266 = 
      port.manufacturer?.toLowerCase().includes('silicon labs') ||
      port.manufacturer?.toLowerCase().includes('ch340') ||
      port.manufacturer?.toLowerCase().includes('cp210') ||
      port.manufacturer?.toLowerCase().includes('ftdi') ||
      port.path.includes('USB');
    
    if (isESP8266) {
      console.log(`  ⭐ LIKELY ESP8266 ⭐`);
    }
    console.log('');
  });
  
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  console.log('💡 Look for ports with:');
  console.log('   - "Silicon Labs" manufacturer (CP2102)');
  console.log('   - "CH340" manufacturer');
  console.log('   - "USB" in the path');
  console.log('');
  console.log('💡 If you see COM ports but none marked as ESP8266,');
  console.log('   try each one manually in the server config.\n');
  
}).catch(err => {
  console.error('❌ Error listing ports:', err.message);
});

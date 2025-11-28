const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const EventEmitter = require('events');

/**
 * ESP8266 Sensor Reader Service
 * Reads BPM and SpO2 data from MAX30102 sensor via serial port
 */
class ESP8266Reader extends EventEmitter {
  constructor() {
    super();
    this.port = null;
    this.parser = null;
    this.isConnected = false;
    this.currentData = {
      bpm: 0,
      spo2: 0,
      timestamp: null
    };
  }

  /**
   * List available serial ports
   */
  async listPorts() {
    try {
      const ports = await SerialPort.list();
      console.log('📡 Available serial ports:');
      ports.forEach((port, index) => {
        console.log(`  ${index + 1}. ${port.path} - ${port.manufacturer || 'Unknown'}`);
      });
      return ports;
    } catch (error) {
      console.error('❌ Error listing ports:', error.message);
      return [];
    }
  }

  /**
   * Connect to ESP8266 on specified port
   * @param {string} portPath - COM port path (e.g., 'COM3' or '/dev/ttyUSB0')
   * @param {number} baudRate - Baud rate (default: 115200)
   */
  async connect(portPath, baudRate = 115200) {
    try {
      // If no port specified, try to auto-detect
      if (!portPath) {
        portPath = await this.autoDetectPort();
        if (!portPath) {
          throw new Error('No suitable serial port found. Please specify the port manually.');
        }
      }

      console.log(`🔌 Connecting to ESP8266 on ${portPath} @ ${baudRate} baud...`);

      this.port = new SerialPort({
        path: portPath,
        baudRate: baudRate,
        autoOpen: false
      });

      // Create a parser to read line by line
      this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

      // Open the port
      await new Promise((resolve, reject) => {
        this.port.open((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      this.isConnected = true;
      console.log(`✅ Connected to ESP8266 on ${portPath}`);

      // Set up data listener
      this.parser.on('data', (line) => this.parseData(line));

      // Handle errors
      this.port.on('error', (err) => {
        console.error('❌ Serial port error:', err.message);
        this.emit('error', err);
      });

      this.port.on('close', () => {
        console.log('🔌 Serial port disconnected');
        this.isConnected = false;
        this.emit('disconnected');
      });

      this.emit('connected', portPath);
      return true;

    } catch (error) {
      console.error('❌ Failed to connect to ESP8266:', error.message);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Auto-detect ESP8266 port
   */
  async autoDetectPort() {
    const ports = await SerialPort.list();
    
    // Look for common ESP8266/NodeMCU identifiers
    const esp8266Port = ports.find(port => 
      port.manufacturer?.toLowerCase().includes('silicon labs') ||
      port.manufacturer?.toLowerCase().includes('ch340') ||
      port.manufacturer?.toLowerCase().includes('cp210') ||
      port.path.includes('USB')
    );

    if (esp8266Port) {
      console.log(`🔍 Auto-detected ESP8266 on ${esp8266Port.path}`);
      return esp8266Port.path;
    }

    // If not found, return the first available port
    if (ports.length > 0) {
      console.log(`⚠️ ESP8266 not auto-detected, using first port: ${ports[0].path}`);
      return ports[0].path;
    }

    return null;
  }

  /**
   * Parse incoming data from ESP8266
   * Expected format: "BPM: 75 | SpO2: 98"
   */
  parseData(line) {
    try {
      line = line.trim();
      
      // Skip empty lines and debug messages
      if (!line || line.startsWith('MAX30102') || line.startsWith('Scaling')) {
        return;
      }

      console.log(`📊 Received: ${line}`);

      // Parse format: "BPM: 75 | SpO2: 98"
      const bpmMatch = line.match(/BPM:\s*(\d+)/i);
      const spo2Match = line.match(/SpO2:\s*(\d+)/i);

      if (bpmMatch && spo2Match) {
        const bpm = parseInt(bpmMatch[1]);
        const spo2 = parseInt(spo2Match[1]);

        // Update current data
        this.currentData = {
          bpm: bpm,
          spo2: spo2,
          timestamp: new Date().toISOString()
        };

        // Emit the new data event
        this.emit('data', {
          heart_rate: bpm,
          spo2: spo2,
          timestamp: this.currentData.timestamp,
          data_source: 'esp8266_sensor'
        });

        console.log(`💓 Heart Rate: ${bpm} bpm | 🩸 SpO2: ${spo2}%`);
      }
    } catch (error) {
      console.error('❌ Error parsing sensor data:', error.message);
    }
  }

  /**
   * Get the latest sensor reading
   */
  getLatestData() {
    return this.currentData;
  }

  /**
   * Check if sensor is connected and receiving data
   */
  isReady() {
    return this.isConnected && this.currentData.timestamp !== null;
  }

  /**
   * Disconnect from the sensor
   */
  async disconnect() {
    if (this.port && this.port.isOpen) {
      await new Promise((resolve) => {
        this.port.close(() => {
          console.log('🔌 Disconnected from ESP8266');
          resolve();
        });
      });
    }
    this.isConnected = false;
    this.port = null;
    this.parser = null;
  }
}

module.exports = ESP8266Reader;

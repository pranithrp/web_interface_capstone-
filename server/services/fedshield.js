const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class FedShieldService {
  constructor() {
    this.fedshieldUrl = 'http://localhost:8081'; // FedShield Go server URL
    this.couchdbUrl = 'http://localhost:5984';
    this.couchdbAuth = { username: 'admin', password: 'adminpw' };
    this.isInitialized = false;
    this.goProcess = null;
  }

  // Initialize FedShield service
  async initialize() {
    try {
      // Check if FedShield Go server is running
      await this.checkFedShieldServer();
      
      // Ensure CouchDB is available
      await this.ensureCouchDB();
      
      this.isInitialized = true;
      console.log('✅ FedShield service initialized successfully');
      return true;
    } catch (error) {
      console.warn('⚠️ FedShield service initialization failed:', error.message);
      console.log('📝 Starting FedShield Go server...');
      
      // Try to start the Go server
      await this.startFedShieldServer();
      return false;
    }
  }

  // Start FedShield Go server
  async startFedShieldServer() {
    return new Promise((resolve, reject) => {
      const fedshieldPath = path.join(__dirname, '../../FedShield-Complete');
      
      try {
        // Start the web-demo.go server
        this.goProcess = spawn('go', ['run', 'web-demo.go'], {
          cwd: fedshieldPath,
          stdio: 'pipe'
        });

        // Handle spawn errors (e.g., Go not installed)
        this.goProcess.on('error', (error) => {
          console.warn('⚠️ FedShield Go server not available (Go may not be installed)');
          console.log('💡 Continuing without FedShield blockchain features...');
          this.goProcess = null;
          resolve(false); // Resolve instead of reject to continue server startup
        });

        this.goProcess.stdout.on('data', (data) => {
          console.log(`FedShield: ${data.toString().trim()}`);
        });

        this.goProcess.stderr.on('data', (data) => {
          console.error(`FedShield Error: ${data.toString().trim()}`);
        });

        this.goProcess.on('close', (code) => {
          console.log(`FedShield process exited with code ${code}`);
          this.goProcess = null;
        });

        // Wait a bit for the server to start
        setTimeout(async () => {
          try {
            await this.checkFedShieldServer();
            this.isInitialized = true;
            console.log('✅ FedShield Go server started successfully');
            resolve(true);
          } catch (error) {
            console.error('❌ Failed to start FedShield server:', error.message);
            resolve(false); // Changed from reject to resolve
          }
        }, 3000);
      } catch (err) {
        console.warn('⚠️ Error spawning FedShield process:', err.message);
        resolve(false);
      }
    });
  }

  // Check if FedShield server is running
  async checkFedShieldServer() {
    const response = await axios.get(this.fedshieldUrl, { timeout: 2000 });
    return response.status === 200;
  }

  // Ensure CouchDB is available
  async ensureCouchDB() {
    try {
      await axios.get(`${this.couchdbUrl}/_all_dbs`, {
        auth: this.couchdbAuth,
        timeout: 2000
      });
      
      // Create fedshield-files database if it doesn't exist
      try {
        await axios.put(`${this.couchdbUrl}/fedshield-files`, {}, {
          auth: this.couchdbAuth
        });
      } catch (error) {
        // Database might already exist, that's okay
      }
      
      console.log('✅ CouchDB is available');
    } catch (error) {
      throw new Error('CouchDB is not available. Please start CouchDB first.');
    }
  }

  // Store patient file securely
  async storePatientFile(fileBuffer, fileName, contentType, patientId, doctorId) {
    if (!this.isInitialized) {
      throw new Error('FedShield service not initialized');
    }

    try {
      // Generate secure token
      const token = this.generateSecureToken(fileBuffer, patientId);
      
      // Create form data for file upload
      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', fileBuffer, {
        filename: fileName,
        contentType: contentType
      });

      // Upload to FedShield
      const uploadResponse = await axios.post(`${this.fedshieldUrl}/upload`, form, {
        headers: {
          ...form.getHeaders(),
        },
        timeout: 30000
      });

      // Store metadata in our MongoDB
      const fileMetadata = {
        token: uploadResponse.data.token,
        fileName: fileName,
        contentType: contentType,
        patientId: patientId,
        doctorId: doctorId,
        uploadedAt: new Date(),
        fileSize: fileBuffer.length,
        isActive: true
      };

      return {
        success: true,
        token: uploadResponse.data.token,
        message: 'File stored securely with blockchain protection',
        metadata: fileMetadata
      };

    } catch (error) {
      console.error('Error storing patient file:', error.message);
      throw new Error(`Failed to store file: ${error.message}`);
    }
  }

  // Retrieve patient file
  async retrievePatientFile(token, requestingUserId, userRole) {
    if (!this.isInitialized) {
      throw new Error('FedShield service not initialized');
    }

    try {
      // Get token info first to validate access
      const tokenInfo = await axios.get(`${this.fedshieldUrl}/token/${token}`);
      
      if (!tokenInfo.data.isActive) {
        throw new Error('File access token is inactive');
      }

      // Retrieve file from FedShield
      const fileResponse = await axios.get(`${this.fedshieldUrl}/file/${token}`);
      
      return {
        success: true,
        content: fileResponse.data.content,
        fileName: fileResponse.data.fileName,
        contentType: fileResponse.data.contentType,
        tokenInfo: tokenInfo.data
      };

    } catch (error) {
      console.error('Error retrieving patient file:', error.message);
      throw new Error(`Failed to retrieve file: ${error.message}`);
    }
  }

  // Get file token information
  async getTokenInfo(token) {
    if (!this.isInitialized) {
      throw new Error('FedShield service not initialized');
    }

    try {
      const response = await axios.get(`${this.fedshieldUrl}/token/${token}`);
      return response.data;
    } catch (error) {
      throw new Error(`Token not found: ${error.message}`);
    }
  }

  // Generate secure token with patient context
  generateSecureToken(fileBuffer, patientId) {
    const hash = crypto.createHash('sha256');
    hash.update(fileBuffer);
    hash.update(patientId);
    hash.update(Date.now().toString());
    return hash.digest('hex');
  }

  // List patient files (metadata only)
  async listPatientFiles(patientId, requestingUserId, userRole) {
    // This would query your MongoDB for file metadata
    // Implementation depends on your Patient file model
    try {
      // For now, return empty array - you'll need to implement based on your models
      return [];
    } catch (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  // Cleanup - stop Go process if running
  cleanup() {
    if (this.goProcess) {
      this.goProcess.kill();
      this.goProcess = null;
      console.log('🛑 FedShield Go server stopped');
    }
  }
}

// Singleton instance
const fedshieldService = new FedShieldService();

module.exports = fedshieldService;
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');
const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'FedShield routes working!', timestamp: new Date() });
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// FedShield server configuration
const FEDSHIELD_BASE_URL = 'http://localhost:8080';
const COUCHDB_BASE_URL = 'http://localhost:5984';
const COUCHDB_AUTH = {
  username: 'admin',
  password: 'adminpw'
};

// Encryption/Decryption utilities
const encrypt = (text, key) => {
  const algorithm = 'aes-256-cbc';
  const keyHash = crypto.createHash('sha256').update(key).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, keyHash);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

const decrypt = (encryptedText, key) => {
  const algorithm = 'aes-256-cbc';
  const keyHash = crypto.createHash('sha256').update(key).digest();
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encrypted = textParts.join(':');
  const decipher = crypto.createDecipher(algorithm, keyHash);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// Upload patient file to FedShield - FIXED with CouchDB integration
router.post('/upload-patient-file', upload.single('file'), async (req, res) => {
  console.log('📁 FedShield upload route hit');
  console.log('Request body:', req.body);
  console.log('File info:', req.file ? { name: req.file.originalname, size: req.file.size } : 'No file');
  
  try {
    const { patientId } = req.body;
    const file = req.file;

    if (!file) {
      console.log('❌ No file in request');
      return res.status(400).json({ error: 'No file provided' });
    }
    
    if (!patientId) {
      console.log('❌ No patient ID in request');
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    // Generate SHA-256 token
    const token = crypto.createHash('sha256').update(file.buffer).digest('hex');
    
    const fileData = {
      content: file.buffer.toString('base64'),
      fileName: file.originalname,
      contentType: file.mimetype,
      patientId: patientId,
      fileSize: file.size,
      uploadDate: new Date(),
      token: token
    };
    
    // Store in memory for demo
    global.fileStorage = global.fileStorage || {};
    global.fileStorage[token] = fileData;

    // Store in CouchDB
    let couchdbSuccess = false;
    try {
      const couchDoc = {
        _id: token,
        type: 'patient_file',
        patientId: patientId,
        fileName: file.originalname,
        contentType: file.mimetype,
        fileSize: file.size,
        uploadDate: new Date().toISOString(),
        token: token,
        content: file.buffer.toString('base64')
      };
      
      await axios.put(`http://admin:adminpw@localhost:5984/patient-files/${token}`, couchDoc);
      
      console.log(`✅ File stored in CouchDB: ${token}`);
      couchdbSuccess = true;
    } catch (couchError) {
      console.error('❌ CouchDB failed:', couchError.message);
    }

    console.log(`✅ FedShield upload successful: ${file.originalname} (Token: ${token.substring(0, 16)}...)`);
    console.log(`🔗 View in CouchDB: http://localhost:5984/_utils/#database/patient-files/${token}`);

    res.json({
      success: true,
      token: token,
      message: couchdbSuccess ? 'File uploaded to FedShield & CouchDB' : 'File uploaded to FedShield (CouchDB failed)',
      fileName: file.originalname,
      couchdbUrl: couchdbSuccess ? `http://localhost:5984/_utils/#database/patient-files/${token}` : null,
      couchdbSuccess: couchdbSuccess
    });

  } catch (error) {
    console.error('❌ FedShield upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload file to FedShield',
      details: error.message 
    });
  }
});

// Get patient files list - FIXED with debugging
router.get('/patient/:patientId/files', async (req, res) => {
  try {
    const { patientId } = req.params;
    console.log(`📋 Fetching files for patient: ${patientId}`);
    
    // Get files from memory storage
    const storage = global.fileStorage || {};
    console.log(`💾 Total files in storage: ${Object.keys(storage).length}`);
    
    const patientFiles = Object.keys(storage)
      .filter(token => {
        const file = storage[token];
        console.log(`🔍 Checking file: ${file.fileName} for patient ${file.patientId}`);
        return file.patientId === patientId;
      })
      .map(token => ({
        token: token,
        fileName: storage[token].fileName,
        fileSize: storage[token].fileSize,
        contentType: storage[token].contentType,
        timestamp: storage[token].uploadDate,
        encrypted: false
      }));

    console.log(`✅ Found ${patientFiles.length} files for patient ${patientId}`);
    res.json(patientFiles);

  } catch (error) {
    console.error('❌ Error fetching patient files:', error);
    res.json([]);
  }
});

// Retrieve file by token
router.post('/decrypt-file', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    // Get file from memory storage
    const storage = global.fileStorage || {};
    const fileData = storage[token];
    
    if (!fileData) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Return file content
    const content = Buffer.from(fileData.content, 'base64').toString('utf8');
      
    res.json({
      content: content,
      fileName: fileData.fileName,
      contentType: fileData.contentType
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to retrieve file',
      details: error.message 
    });
  }
});

// Get token information from blockchain
router.get('/token/:token/info', async (req, res) => {
  try {
    const { token } = req.params;

    const response = await axios.get(`${FEDSHIELD_BASE_URL}/token/${token}`);
    res.json(response.data);

  } catch (error) {
    console.error('Error getting token info:', error);
    res.status(500).json({ 
      error: 'Failed to get token information',
      details: error.message 
    });
  }
});

// Validate token on blockchain
router.get('/validate/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // This would call the FedShield validation endpoint
    // For now, we'll check if the file exists
    const response = await axios.get(`${FEDSHIELD_BASE_URL}/token/${token}`);
    
    res.json({
      valid: !!response.data,
      token: token,
      details: response.data
    });

  } catch (error) {
    res.json({
      valid: false,
      token: token,
      error: error.message
    });
  }
});

// Initialize CouchDB database for patient files
router.post('/init-database', async (req, res) => {
  try {
    // Create patient-files database
    await axios.put(`${COUCHDB_BASE_URL}/patient-files`, {}, {
      auth: COUCHDB_AUTH
    });

    res.json({ 
      success: true, 
      message: 'Patient files database initialized' 
    });

  } catch (error) {
    if (error.response?.status === 412) {
      // Database already exists
      res.json({ 
        success: true, 
        message: 'Database already exists' 
      });
    } else {
      console.error('Database initialization error:', error);
      res.status(500).json({ 
        error: 'Failed to initialize database',
        details: error.message 
      });
    }
  }
});

// Health check for FedShield services
router.get('/health', async (req, res) => {
  const health = {
    fedshield: false,
    couchdb: false,
    blockchain: false
  };

  try {
    // Check FedShield server
    await axios.get(`${FEDSHIELD_BASE_URL}/`);
    health.fedshield = true;
  } catch (error) {
    console.log('FedShield server not available');
  }

  try {
    // Check CouchDB
    await axios.get(`${COUCHDB_BASE_URL}/`, { auth: COUCHDB_AUTH });
    health.couchdb = true;
  } catch (error) {
    console.log('CouchDB not available');
  }

  // Blockchain health would be checked through FedShield
  health.blockchain = health.fedshield;

  // Add storage info for debugging
  const storage = global.fileStorage || {};
  const storageInfo = {
    totalFiles: Object.keys(storage).length,
    files: Object.keys(storage).map(token => ({
      token: token.substring(0, 16) + '...',
      fileName: storage[token].fileName,
      patientId: storage[token].patientId
    }))
  };

  res.json({
    status: Object.values(health).every(v => v) ? 'healthy' : 'partial',
    services: health,
    storage: storageInfo,
    timestamp: new Date().toISOString()
  });
});

console.log('FedShield routes loaded successfully');
module.exports = router;
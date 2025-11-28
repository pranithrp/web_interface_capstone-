const axios = require('axios');

const COUCHDB_BASE_URL = 'http://localhost:5984';
const COUCHDB_AUTH = {
  username: 'admin',
  password: 'adminpw'
};

async function initializeCouchDB() {
  try {
    console.log('🔧 Initializing CouchDB for FedShield...');

    // Create patient-files database
    try {
      await axios.put(`${COUCHDB_BASE_URL}/patient-files`, {}, {
        auth: COUCHDB_AUTH
      });
      console.log('✅ Created patient-files database');
    } catch (error) {
      if (error.response?.status === 412) {
        console.log('ℹ️ patient-files database already exists');
      } else {
        throw error;
      }
    }

    // Create fedshield-files database (for FedShield app)
    try {
      await axios.put(`${COUCHDB_BASE_URL}/fedshield-files`, {}, {
        auth: COUCHDB_AUTH
      });
      console.log('✅ Created fedshield-files database');
    } catch (error) {
      if (error.response?.status === 412) {
        console.log('ℹ️ fedshield-files database already exists');
      } else {
        throw error;
      }
    }

    // Test connection
    const response = await axios.get(`${COUCHDB_BASE_URL}/`, { auth: COUCHDB_AUTH });
    console.log('✅ CouchDB connection successful');
    console.log(`📊 CouchDB version: ${response.data.version}`);

    console.log('🔐 FedShield CouchDB initialization complete!');

  } catch (error) {
    console.error('❌ CouchDB initialization failed:', error.message);
    console.log('💡 Make sure CouchDB is running on localhost:5984');
    console.log('💡 Default credentials: admin/adminpw');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeCouchDB();
}

module.exports = initializeCouchDB;
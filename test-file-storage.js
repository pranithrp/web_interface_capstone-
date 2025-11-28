// Test file storage functionality
const axios = require('axios');

async function testFileStorage() {
  try {
    console.log('🧪 Testing file storage...');
    
    // Check if server is running
    const healthCheck = await axios.get('http://localhost:5000/api/fedshield/test');
    console.log('✅ Server is running:', healthCheck.data.message);
    
    // Check current storage
    const filesResponse = await axios.get('http://localhost:5000/api/fedshield/patient/P001/files');
    console.log('📁 Current files for P001:', filesResponse.data);
    
    // Check global storage directly
    const storageCheck = await axios.get('http://localhost:5000/api/fedshield/health');
    console.log('🏥 Service health:', storageCheck.data);
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testFileStorage();
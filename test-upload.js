const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testUpload() {
  try {
    console.log('🧪 Testing file upload to server...');
    
    // Create a test file
    const testContent = 'This is a test file for patient P001\nHeart Rate: 75 bpm\nBlood Pressure: 120/80\nDate: ' + new Date().toISOString();
    const testFilePath = path.join(__dirname, 'test-file.txt');
    fs.writeFileSync(testFilePath, testContent);
    
    // Test server health first
    try {
      const healthResponse = await axios.get('http://localhost:5000/api/fedshield/test');
      console.log('✅ Server is running:', healthResponse.data);
    } catch (error) {
      console.log('❌ Server not responding. Make sure to run: npm start');
      return;
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));
    formData.append('patientId', 'P001');
    
    // Test upload
    const response = await axios.post('http://localhost:5000/api/fedshield/upload-patient-file', formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
    
    console.log('✅ Upload successful!');
    console.log('Response:', response.data);
    console.log('Token:', response.data.token);
    
    // Test file retrieval
    const retrieveResponse = await axios.post('http://localhost:5000/api/fedshield/decrypt-file', {
      token: response.data.token
    });
    
    console.log('✅ File retrieval successful!');
    console.log('Retrieved content:', retrieveResponse.data.content);
    
    // Clean up
    fs.unlinkSync(testFilePath);
    console.log('🧹 Test file cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testUpload();
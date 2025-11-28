import React, { useState, useEffect } from 'react';
import axios from 'axios';

const HistoricalFilesViewer = ({ patientId, patientName, onClose }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState('');
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);
  const [fileContent, setFileContent] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(null);

  useEffect(() => {
    fetchPatientFiles();
  }, [patientId]);

  const fetchPatientFiles = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/fedshield/patient/${patientId}/files`);
      // Ensure response.data is always an array
      const filesData = Array.isArray(response.data) ? response.data : [];
      setFiles(filesData);
      setError('');
    } catch (err) {
      setError('Failed to fetch patient files');
      setFiles([]); // Set empty array on error
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setShowKeyPrompt(true);
    setEncryptionKey('');
    setFileContent(null);
  };

  const handleDecryptAndView = async () => {
    if (!encryptionKey.trim()) {
      alert('Please enter the file token');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('/api/fedshield/decrypt-file', {
        token: encryptionKey // Using encryptionKey field for token input
      });
      
      setFileContent(response.data);
      setShowKeyPrompt(false);
      setError('');
    } catch (err) {
      setError('Failed to retrieve file. Please check your token.');
      console.error('Retrieval error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) {
      alert('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      setError('');
      
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('patientId', patientId);

      console.log('Uploading file:', uploadFile.name, 'for patient:', patientId);

      const response = await axios.post('/api/fedshield/upload-patient-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('Upload response:', response.data);
      
      // Show success message in the panel instead of popup
      setError('');
      setUploadSuccess({
        message: response.data.message,
        fileName: response.data.fileName,
        token: response.data.token,
        timestamp: new Date().toLocaleString(),
        couchdbSuccess: response.data.couchdbSuccess
      });
      
      setUploadFile(null);
      fetchPatientFiles(); // Refresh the file list
    } catch (err) {
      console.error('Upload error details:', err.response?.data || err.message);
      setError(`Failed to upload file: ${err.response?.data?.error || err.message}`);
      setUploadSuccess(null); // Clear any previous success message
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-5/6 relative animate-fade-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Historical Files</h2>
            <p className="text-gray-600">Patient: {patientName} (ID: {patientId})</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center text-red-600 hover:text-red-700 transition-all duration-200"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* File List Panel */}
          <div className="w-1/2 border-r border-gray-200 flex flex-col">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Patient Files</h3>
              
              {/* Upload Section */}
              <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">Upload New File</h4>
                <div className="space-y-2">
                  <input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.png,.csv"
                  />
                  <button
                    onClick={handleFileUpload}
                    disabled={uploading || !uploadFile}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm font-medium"
                  >
                    {uploading ? 'Uploading...' : 'Upload to FedShield'}
                  </button>
                  <p className="text-xs text-gray-500">
                    🔐 Files are automatically secured with SHA-256 tokens
                  </p>
                </div>
                
                {/* Success Message Display */}
                {uploadSuccess && (
                  <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 text-lg">✅</span>
                      <div className="flex-1">
                        <h5 className="font-semibold text-green-800 mb-1">{uploadSuccess.message}</h5>
                        <p className="text-sm text-green-700 mb-2">
                          <strong>File:</strong> {uploadSuccess.fileName}
                        </p>
                        <p className="text-sm text-green-700 mb-2">
                          <strong>Uploaded:</strong> {uploadSuccess.timestamp}
                        </p>
                        <div className="bg-white p-2 rounded border">
                          <p className="text-xs font-semibold text-gray-700 mb-1">SHA-256 Token (Copy this for file access):</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs bg-gray-100 p-2 rounded font-mono break-all">
                              {uploadSuccess.token}
                            </code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(uploadSuccess.token);
                                alert('Token copied to clipboard!');
                              }}
                              className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                        {uploadSuccess.couchdbSuccess && (
                          <div className="mt-2 p-2 bg-blue-50 rounded border">
                            <p className="text-xs font-semibold text-blue-700 mb-1">🗄️ View in CouchDB:</p>
                            <a 
                              href={`http://localhost:5984/_utils/#database/patient-files/${uploadSuccess.token}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 underline break-all"
                            >
                              http://localhost:5984/_utils/#database/patient-files/{uploadSuccess.token.substring(0, 16)}...
                            </a>
                          </div>
                        )}
                        {!uploadSuccess.couchdbSuccess && (
                          <div className="mt-2 p-2 bg-yellow-50 rounded border">
                            <p className="text-xs text-yellow-700">⚠️ CouchDB storage failed - file available in memory only</p>
                          </div>
                        )}
                        <button
                          onClick={() => setUploadSuccess(null)}
                          className="mt-2 text-xs text-green-600 hover:text-green-800 underline"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading && !files.length ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">📁</div>
                  <p className="text-gray-500">No files found for this patient</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                        selectedFile?.token === file.token
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => handleFileSelect(file)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-800 truncate">{file.fileName}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.fileSize)} • {formatDate(file.timestamp)}
                          </p>
                          <p className="text-xs text-blue-600 font-mono">
                            Token: {file.token.substring(0, 16)}...
                          </p>
                        </div>
                        <div className="ml-2">
                          <span className="text-2xl">
                            {file.contentType?.includes('image') ? '🖼️' :
                             file.contentType?.includes('pdf') ? '📄' :
                             file.contentType?.includes('text') ? '📝' : '📁'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* File Content Panel */}
          <div className="w-1/2 flex flex-col">
            {showKeyPrompt ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="bg-white p-8 rounded-xl border-2 border-gray-200 shadow-lg max-w-md w-full">
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-2">🔐</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">File Access Required</h3>
                    <p className="text-gray-600 text-sm">
                      Enter the SHA-256 token to access this file from FedShield.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Enter File Token
                      </label>
                      <input
                        type="text"
                        value={encryptionKey}
                        onChange={(e) => setEncryptionKey(e.target.value)}
                        placeholder="Enter the SHA-256 token for this file"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        onKeyPress={(e) => e.key === 'Enter' && handleDecryptAndView()}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleDecryptAndView}
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium"
                      >
                        {loading ? 'Retrieving...' : 'Retrieve & View'}
                      </button>
                      <button
                        onClick={() => {
                          setShowKeyPrompt(false);
                          setSelectedFile(null);
                          setEncryptionKey('');
                        }}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-700">
                      <strong>🔒 FedShield Security:</strong> Files are secured with SHA-256 tokens. 
                      Use the token from the file list or the one provided during upload.
                    </p>
                  </div>
                </div>
              </div>
            ) : fileContent ? (
              <div className="flex-1 flex flex-col">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">File Content</h3>
                  <p className="text-sm text-gray-600">{fileContent.fileName}</p>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  {fileContent.contentType?.includes('image') ? (
                    <img
                      src={`data:${fileContent.contentType};base64,${btoa(fileContent.content)}`}
                      alt={fileContent.fileName}
                      className="max-w-full h-auto rounded-lg shadow-md"
                    />
                  ) : fileContent.contentType?.includes('text') || fileContent.fileName?.endsWith('.csv') ? (
                    <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-4 rounded-lg overflow-auto">
                      {fileContent.content}
                    </pre>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">📄</div>
                      <p className="text-gray-600 mb-4">
                        File type: {fileContent.contentType}
                      </p>
                      <p className="text-gray-500 text-sm">
                        This file type cannot be previewed directly. 
                        The file has been successfully decrypted from FedShield.
                      </p>
                      <button
                        onClick={() => {
                          const blob = new Blob([fileContent.content], { type: fileContent.contentType });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = fileContent.fileName;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                      >
                        Download File
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-gray-400 text-6xl mb-4">🔍</div>
                  <p className="text-gray-500 text-lg">Select a file to view its content</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Files are securely stored using FedShield blockchain technology
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border-t border-red-200">
            <div className="flex items-center gap-2 text-red-700">
              <span>⚠️</span>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                FedShield Blockchain Security
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                CouchDB Storage
              </span>
            </div>
            <span>{files.length} files total</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoricalFilesViewer;
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const HeartRateDataViewer = ({ patientId, patientName, onClose }) => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [heartRateData, setHeartRateData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHeartRateFiles();
  }, [patientId]);

  const fetchHeartRateFiles = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/patient/${patientId}/heart-rate-files`);
      setFiles(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch heart rate files');
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHeartRateData = async (filename) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/patient/${patientId}/heart-rate-data/${filename}`);
      setHeartRateData(response.data);
      setSelectedFile(filename);
      setError('');
    } catch (err) {
      setError('Failed to fetch heart rate data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getHeartRateStatus = (heartRate) => {
    if (heartRate < 60) return { status: 'Low', color: 'text-blue-600 bg-blue-100' };
    if (heartRate > 100) return { status: 'High', color: 'text-red-600 bg-red-100' };
    return { status: 'Normal', color: 'text-green-600 bg-green-100' };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Heart Rate Data</h2>
              <p className="text-blue-100">Patient: {patientName} ({patientId})</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:bg-opacity-20 transition-all"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading...</span>
            </div>
          )}

          {/* File Selection */}
          {!selectedFile && !loading && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Available Heart Rate Files</h3>
              {files.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">📊</div>
                  <p className="text-gray-500">No heart rate data files found for this patient.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {files.map((file) => (
                    <button
                      key={file.filename}
                      onClick={() => fetchHeartRateData(file.filename)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left"
                    >
                      <div className="font-semibold text-gray-800">{file.displayName}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        Date: {file.date} | Hour: {file.hour}:00
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Heart Rate Data Display */}
          {heartRateData && !loading && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-800">
                  Heart Rate Data - {selectedFile}
                </h3>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setHeartRateData(null);
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  ← Back to Files
                </button>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-sm font-semibold text-blue-600">Total Readings</div>
                  <div className="text-2xl font-bold text-blue-800">{heartRateData.statistics.count}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-sm font-semibold text-green-600">Average</div>
                  <div className="text-2xl font-bold text-green-800">{heartRateData.statistics.average} bpm</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="text-sm font-semibold text-red-600">Maximum</div>
                  <div className="text-2xl font-bold text-red-800">{heartRateData.statistics.max} bpm</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="text-sm font-semibold text-purple-600">Minimum</div>
                  <div className="text-2xl font-bold text-purple-800">{heartRateData.statistics.min} bpm</div>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Heart Rate (bpm)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {heartRateData.data.map((row, index) => {
                        const hrStatus = getHeartRateStatus(parseInt(row.heart_rate));
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatTime(row.timestamp)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {row.heart_rate}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${hrStatus.color}`}>
                                {hrStatus.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeartRateDataViewer;

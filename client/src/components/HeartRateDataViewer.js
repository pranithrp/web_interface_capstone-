import React, { useState, useEffect } from 'react';
import axios from 'axios';

const HeartRateDataViewer = ({ patientId, patientName, onClose, warnings = [], heartRateHistory = [] }) => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [heartRateData, setHeartRateData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('live'); // 'live' or 'historical'

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
    if (heartRate < 60) return { 
      status: 'Bradycardia', 
      color: 'text-blue-600 bg-blue-100',
      severity: heartRate < 50 ? 'Critical' : 'Warning'
    };
    if (heartRate > 100) return { 
      status: 'Tachycardia', 
      color: 'text-red-600 bg-red-100',
      severity: heartRate > 120 ? 'Critical' : 'Warning'
    };
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
          {/* View Mode Selector */}
          <div className="mb-6">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setViewMode('live')}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  viewMode === 'live'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                📊 Live Data & Warnings
              </button>
              <button
                onClick={() => setViewMode('historical')}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  viewMode === 'historical'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                📁 Historical Files
              </button>
            </div>
          </div>

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

          {/* Live Data View */}
          {viewMode === 'live' && (
            <div className="space-y-6">
              {/* Real-time Warnings */}
              <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-xl border border-orange-200">
                <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center gap-2">
                  <span className="text-xl">⚠️</span>
                  Real-time Warnings & Alerts
                  {warnings.length > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {warnings.length}
                    </span>
                  )}
                </h3>
                
                {warnings.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {warnings.map((warning) => (
                      <div key={warning.id} className={`p-4 rounded-lg border-2 ${
                        warning.severity === 'Critical' 
                          ? 'bg-red-100 border-red-300 text-red-800'
                          : 'bg-yellow-100 border-yellow-300 text-yellow-800'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-lg">
                                {warning.type.toUpperCase()}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                warning.severity === 'Critical' 
                                  ? 'bg-red-200 text-red-700'
                                  : 'bg-yellow-200 text-yellow-700'
                              }`}>
                                {warning.severity}
                              </span>
                            </div>
                            <div className="text-sm">
                              Heart Rate: <span className="font-semibold">{warning.heart_rate} bpm</span>
                            </div>
                            <div className="text-xs opacity-75 mt-1">
                              {warning.timestamp.toLocaleString()}
                            </div>
                          </div>
                          <div className="text-2xl">
                            {warning.severity === 'Critical' ? '🚨' : '⚠️'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">✅</div>
                    <p className="text-green-600 font-medium">No warnings detected</p>
                    <p className="text-gray-500 text-sm">Patient's heart rate is within normal range</p>
                  </div>
                )}
              </div>
              
              {/* Live Heart Rate History */}
              {heartRateHistory.length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Live Heart Rate History</h3>
                  
                  {/* Enhanced Graph */}
                  <div className="h-64 relative bg-gray-50 rounded-lg p-4">
                    <svg className="w-full h-full" viewBox="0 0 400 200">
                      {/* Grid lines */}
                      <defs>
                        <pattern id="grid" width="40" height="25" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 25" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                      
                      {/* Reference lines */}
                      <line x1="0" y1="140" x2="400" y2="140" stroke="#ef4444" strokeWidth="1" strokeDasharray="5,5" opacity="0.5"/>
                      <line x1="0" y1="100" x2="400" y2="100" stroke="#10b981" strokeWidth="1" strokeDasharray="5,5" opacity="0.5"/>
                      <line x1="0" y1="60" x2="400" y2="60" stroke="#3b82f6" strokeWidth="1" strokeDasharray="5,5" opacity="0.5"/>
                      
                      {/* Heart rate line */}
                      <polyline
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="3"
                        points={
                          heartRateHistory.map((reading, index) => {
                            const x = (index / (heartRateHistory.length - 1)) * 380 + 10;
                            const y = 190 - ((reading.heart_rate - 40) / 140) * 180;
                            return `${x},${y}`;
                          }).join(' ')
                        }
                      />
                      
                      {/* Data points */}
                      {heartRateHistory.map((reading, index) => {
                        const x = (index / (heartRateHistory.length - 1)) * 380 + 10;
                        const y = 190 - ((reading.heart_rate - 40) / 140) * 180;
                        return (
                          <circle
                            key={index}
                            cx={x}
                            cy={y}
                            r="4"
                            fill={reading.abnormality?.severity === 'critical' ? "#dc2626" : 
                                 reading.abnormality?.severity === 'warning' ? "#d97706" : "#059669"}
                            stroke="#fff"
                            strokeWidth="2"
                          />
                        );
                      })}
                    </svg>
                    
                    {/* Labels */}
                    <div className="absolute left-0 top-0 text-xs text-gray-500">180</div>
                    <div className="absolute left-0 top-1/4 text-xs text-gray-500">140</div>
                    <div className="absolute left-0 top-1/2 text-xs text-gray-500">100</div>
                    <div className="absolute left-0 top-3/4 text-xs text-gray-500">60</div>
                    <div className="absolute left-0 bottom-0 text-xs text-gray-500">40</div>
                  </div>
                  
                  {/* Recent readings table */}
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-700 mb-2">Recent Readings</h4>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                      <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-700 mb-2">
                        <div>Time</div>
                        <div>Heart Rate</div>
                        <div>Status</div>
                        <div>Alert</div>
                      </div>
                      {heartRateHistory.slice(-10).reverse().map((reading, index) => {
                        const status = getHeartRateStatus(reading.heart_rate);
                        return (
                          <div key={index} className="grid grid-cols-4 gap-4 text-sm py-2 border-b border-gray-200">
                            <div className="text-gray-600">
                              {reading.timestamp.toLocaleTimeString()}
                            </div>
                            <div className="font-semibold">
                              {reading.heart_rate} bpm
                            </div>
                            <div>
                              <span className={`px-2 py-1 rounded-full text-xs ${status.color}`}>
                                {status.status}
                              </span>
                            </div>
                            <div>
                              {reading.abnormality && (
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  reading.abnormality.severity === 'critical' 
                                    ? 'bg-red-200 text-red-700'
                                    : 'bg-yellow-200 text-yellow-700'
                                }`}>
                                  {reading.abnormality.severity}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Historical Files View */}
          {viewMode === 'historical' && !selectedFile && !loading && (
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

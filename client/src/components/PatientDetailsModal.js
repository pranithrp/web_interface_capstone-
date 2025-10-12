import React from 'react';

const PatientDetailsModal = ({ patient, onClose }) => {
  if (!patient) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'Not recorded';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'Not provided';
    return phone;
  };



  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Patient Details</h2>
              <p className="text-purple-100">Complete patient information</p>
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
          <div className="max-w-2xl mx-auto">

            {/* Personal Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  Personal Information
                </h3>
                
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">👤</div>
                      <div>
                        <div className="text-sm font-semibold text-purple-600">Full Name</div>
                        <div className="text-lg font-bold text-gray-800">{patient.name}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">🆔</div>
                      <div>
                        <div className="text-sm font-semibold text-blue-600">Patient ID</div>
                        <div className="text-lg font-bold text-gray-800">{patient.patientId}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">📱</div>
                      <div>
                        <div className="text-sm font-semibold text-green-600">Mobile Number</div>
                        <div className="text-lg font-bold text-gray-800">{formatPhoneNumber(patient.mobileNumber)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">🏠</div>
                      <div>
                        <div className="text-sm font-semibold text-orange-600">Current Address</div>
                        <div className="text-lg font-bold text-gray-800">{patient.currentAddress || 'Not provided'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-4 rounded-lg border border-indigo-200">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">📅</div>
                      <div>
                        <div className="text-sm font-semibold text-indigo-600">Last Visit Date</div>
                        <div className="text-lg font-bold text-gray-800">{formatDate(patient.lastVisitDate)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Doctor Assignment */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Care Team
                </h3>

                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">👨‍⚕️</div>
                    <div>
                      <div className="text-sm font-semibold text-blue-600">Assigned Doctor</div>
                      <div className="text-lg font-bold text-gray-800">
                        {patient.doctorId ? `Dr. ${patient.doctorId}` : 'No doctor assigned'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDetailsModal;

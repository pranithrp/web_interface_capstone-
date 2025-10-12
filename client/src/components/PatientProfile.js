import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const PatientProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setIsLoading(true);
        const res = await axios.get(`/api/patient/${id}`);
        setPatient(res.data);
      } catch (error) {
        console.error("Error fetching patient data:", error);
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPatient();
  }, [id, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-gray-600">Patient data not available.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <header className="bg-white p-6 rounded-xl shadow-lg mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            {patient.name}'s Profile
          </h1>
          <button
            onClick={() => navigate(`/patient/${id}`)}
            className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg shadow-md hover:from-gray-600 hover:to-gray-700 transition-all duration-300"
          >
            Back to Dashboard
          </button>
        </header>

        {/* Profile Content */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Personal Details
              </h2>
              <p className="text-gray-700 mb-2">
                <span className="font-medium text-blue-600">Patient ID:</span>{" "}
                {patient.patientId}
              </p>
              <p className="text-gray-700 mb-2">
                <span className="font-medium text-blue-600">Assigned Doctor:</span>{" "}
                {patient.doctorId || "Unassigned"}
              </p>
              {/* Add more fields as needed */}
            </div>

            {/* Vitals History */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Vitals History
              </h2>
              {patient.vitals.length > 0 ? (
                <ul className="space-y-4 max-h-96 overflow-y-auto">
                  {patient.vitals.map((vital, index) => (
                    <li
                      key={index}
                      className="p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg shadow-inner"
                    >
                      <p className="text-gray-700">
                        <span className="font-medium">Heart Rate:</span>{" "}
                        {vital.heartRate} bpm
                      </p>
                      <p className="text-gray-700">
                        <span className="font-medium">Blood Pressure:</span>{" "}
                        {vital.bloodPressure}
                      </p>
                      <p className="text-gray-700">
                        <span className="font-medium">Oxygen Level:</span>{" "}
                        {vital.oxygenLevel}%
                      </p>
                      <p className="text-gray-500 text-sm">
                        {new Date(vital.timestamp).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">No vitals history available.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Login = () => {
  const [id, setId] = useState("");
  const [role, setRole] = useState("patient");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  console.log("Login component rendered");

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log("Login triggered with ID:", id, "Role:", role);
    setError("");

    try {
      const endpoint = role === "patient" ? `/api/patient/${id}` : `/api/doctor/${id}`;
      console.log("Fetching:", endpoint);
      const res = await axios.get(endpoint);
      console.log("API response:", res.status, res.data);

      if (res.status === 200) {
        const path = role === "patient" ? `/patient/${id}` : `/doctor/${id}`;
        console.log("Navigating to:", path);
        navigate(path);
      }
    } catch (err) {
      console.error("Login error:", err.response?.status, err.message);
      setError(
        err.response?.status === 404
          ? "User not found. Please check your ID."
          : "Login failed. Try again."
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative bg-white/10 backdrop-blur-lg p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/20">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏥</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            HealthConnect
          </h1>
          <p className="text-blue-200">Remote Patient Monitoring System</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-white font-medium mb-2 flex items-center">
              <span className="mr-2">🆔</span> User ID
            </label>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="Enter your ID (e.g., P001 or D001)"
              className="w-full p-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
              required
            />
          </div>
          <div>
            <label className="block text-white font-medium mb-2 flex items-center">
              <span className="mr-2">👤</span> Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full p-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
            >
              <option value="patient" className="text-gray-800">👨‍⚕️ Patient</option>
              <option value="doctor" className="text-gray-800">🩺 Doctor</option>
            </select>
          </div>
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl">
              <span className="flex items-center">
                <span className="mr-2">⚠️</span>
                {error}
              </span>
            </div>
          )}
          <button
            type="submit"
            className="w-full px-4 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl shadow-lg hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 font-semibold text-lg"
          >
            <span className="flex items-center justify-center">
              <span className="mr-2">🚀</span>
              Sign In
            </span>
          </button>
        </form>

        <div className="mt-8 text-center">
          <div className="text-white/60 text-sm mb-4">Sample Credentials:</div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-blue-300 font-semibold mb-1">Patients</div>
              <div className="text-white/80">P001, P002, P003</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-purple-300 font-semibold mb-1">Doctors</div>
              <div className="text-white/80">D001, D002, D1</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import PatientDashboard from "./components/PatientDashboard";
import DoctorDashboard from "./components/DoctorDashboard";
import PatientProfile from "./components/PatientProfile";
import "./styles/animations.css";

const App = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/patient/:id" element={<PatientDashboard />} />
        <Route path="/patient/:id/profile" element={<PatientProfile />} />
        <Route path="/doctor/:id" element={<DoctorDashboard />} />
      </Routes>
    </div>
  );
};

export default App;
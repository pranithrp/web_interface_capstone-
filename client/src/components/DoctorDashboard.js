import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import VideoCallPopup from "./VideoCallPopup";
import HeartRateDataViewer from "./HeartRateDataViewer";
import PatientDetailsModal from "./PatientDetailsModal";

const socket = io("http://localhost:5000");

// Add socket connection debugging
socket.on("connect", () => {
  console.log("Doctor socket connected:", socket.id);
});

socket.on("disconnect", () => {
  console.log("Doctor socket disconnected");
});

const DoctorDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  // Video call state
  const [videoCallRequest, setVideoCallRequest] = useState(null); // {from: patientId}
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [callError, setCallError] = useState("");
  const [waitingForPatient, setWaitingForPatient] = useState(false);
  const [currentPatientId, setCurrentPatientId] = useState(null);
  const [showHeartRateData, setShowHeartRateData] = useState(false);
  const [heartRatePatient, setHeartRatePatient] = useState(null);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [detailsPatient, setDetailsPatient] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);

  useEffect(() => {
    const fetchDoctorAndPatients = async () => {
      try {
        const doctorRes = await axios.get(`/api/doctor/${id}`);
        setDoctor(doctorRes.data);
        const patientsRes = await axios.get(`/api/doctor/${id}/patients`);
        setPatients(patientsRes.data);
      } catch (error) {
        if (error.response?.status === 404 && error.config.url.includes("/api/doctor/")) {
          navigate("/");
        } else {
          setPatients([]);
        }
      }
    };
    fetchDoctorAndPatients();

    // Join doctor's individual room to receive video call requests from any patient
    console.log("Doctor joining individual room:", id);
    socket.emit("join_doctor_room", { doctorId: id });

    socket.on("receive_message", (message) => {
      if (message.doctorId === id) {
        setMessages((prev) => [...prev, message]);
      }
    });

    // Video call request from patient
    socket.on("video_call_request", ({ from, role }) => {
      console.log("Doctor received video call request from:", from, "role:", role);
      // Only show notification if it's from a patient
      if (role === "patient") {
        setVideoCallRequest({ from, role });
      }
    });

    // Patient accepted call
    socket.on("video_call_accepted", ({ from, role }) => {
      if (role === "patient") {
        console.log("Patient accepted video call, starting call...");
        setCurrentPatientId(from);
        beginVideoCallAsDoctor();
      }
    });

    // End call event
    socket.on("video_call_end", () => {
      endVideoCall();
    });

    // WebRTC signaling
    socket.on("video_offer", async ({ offer, from }) => {
      try {
        console.log("Doctor received video offer from patient");
        setShowVideoCall(true);
        setCallActive(true);
        setWaitingForPatient(false);
        setCurrentPatientId(from);

        // Use existing stream or get new one
        let stream = localStream;
        if (!stream) {
          stream = await getUserMediaWithFallback();
          setLocalStream(stream);
        }

        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        // Create peer connection
        const pc = createPeerConnection(stream);

        // Set remote description first
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        console.log("Doctor set remote description (offer)");

        // Create and set answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log("Doctor created and set local answer");

        socket.emit("video_answer", {
          to: from,
          from: id,
          answer,
          role: "doctor"
        });
      } catch (err) {
        console.error("Doctor could not join video call:", err);
        setCallError("Could not join video call: " + err.message);
      }
    });
    socket.on("video_answer", async ({ answer, from }) => {
      try {
        if (peerConnectionRef.current && peerConnectionRef.current.signalingState === "have-local-offer") {
          console.log("Doctor setting remote description (answer), current state:", peerConnectionRef.current.signalingState);
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          console.log("Doctor set remote description (answer) successfully");
          // Call is now fully established
          setWaitingForPatient(false);
          setCallActive(true);
        } else {
          console.log("Doctor cannot set remote description, wrong state:", peerConnectionRef.current?.signalingState);
        }
      } catch (err) {
        console.error("Doctor error setting remote description:", err);
        setCallError("Could not establish video connection: " + err.message);
      }
    });
    socket.on("video_ice_candidate", async ({ candidate, from }) => {
      if (peerConnectionRef.current && candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("Doctor added ICE candidate from:", from);
        } catch (err) {
          console.error("Doctor failed to add ICE candidate:", err);
        }
      }
    });

    return () => {
      socket.off("receive_message");
      socket.off("video_call_request");
      socket.off("video_call_accepted");
      socket.off("video_call_end");
      socket.off("video_offer");
      socket.off("video_answer");
      socket.off("video_ice_candidate");
    };
  }, [id, navigate]);

  // Helper function to get patient name from ID
  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.patientId === patientId);
    return patient ? patient.name : `Patient ${patientId}`;
  };

  // Helper function to get user media with timeout and fallback constraints
  const getUserMediaWithFallback = async (timeoutMs = 10000) => {
    // Get available devices first to prefer laptop camera
    let preferredVideoDeviceId = null;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log("Doctor - Available video devices:", videoDevices);

      // Prefer built-in camera (usually has "integrated" or "built-in" in label)
      const builtInCamera = videoDevices.find(device =>
        device.label.toLowerCase().includes('integrated') ||
        device.label.toLowerCase().includes('built-in') ||
        device.label.toLowerCase().includes('webcam') ||
        device.label.toLowerCase().includes('camera')
      );

      if (builtInCamera) {
        preferredVideoDeviceId = builtInCamera.deviceId;
        console.log("Doctor using preferred camera:", builtInCamera.label);
      } else if (videoDevices.length > 0) {
        // Use the first available camera
        preferredVideoDeviceId = videoDevices[0].deviceId;
        console.log("Doctor using first available camera:", videoDevices[0].label);
      }
    } catch (err) {
      console.log("Doctor could not enumerate devices:", err);
    }

    const constraints = [
      // Try ideal constraints with preferred device first
      {
        video: {
          deviceId: preferredVideoDeviceId ? { exact: preferredVideoDeviceId } : undefined,
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          facingMode: "user"
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      },
      // Fallback to basic constraints with preferred device
      {
        video: preferredVideoDeviceId ?
          { deviceId: { exact: preferredVideoDeviceId }, width: 640, height: 480 } :
          { width: 640, height: 480 },
        audio: true
      },
      // Last resort - minimal constraints without device preference
      {
        video: true,
        audio: true
      }
    ];

    for (let i = 0; i < constraints.length; i++) {
      try {
        console.log(`Doctor trying constraints ${i + 1}:`, constraints[i]);

        // Add timeout to getUserMedia
        const streamPromise = navigator.mediaDevices.getUserMedia(constraints[i]);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout starting video source')), timeoutMs)
        );

        const stream = await Promise.race([streamPromise, timeoutPromise]);
        console.log(`Doctor success with constraints ${i + 1}`);
        return stream;
      } catch (err) {
        console.log(`Doctor failed with constraints ${i + 1}:`, err.message);
        if (i === constraints.length - 1) {
          throw err; // Re-throw the last error
        }
      }
    }
  };

  // Accept video call
  const acceptVideoCall = async () => {
    if (!videoCallRequest) return;

    try {
      console.log("Doctor requesting camera and microphone permissions...");

      const stream = await getUserMediaWithFallback();
      console.log("Doctor got media stream:", stream);
      console.log("Doctor video tracks:", stream.getVideoTracks());
      console.log("Doctor audio tracks:", stream.getAudioTracks());

      setLocalStream(stream);

      setShowVideoCall(true);
      setCallActive(true);
      setWaitingForPatient(true);
      setCurrentPatientId(videoCallRequest.from);
      setVideoCallRequest(null);
      socket.emit("video_call_accepted", { to: videoCallRequest.from, from: id, role: "doctor" });
      // Wait for offer from patient, then handle in signaling above
    } catch (err) {
      console.error("Doctor failed to get camera/microphone access:", err);
      console.error("Doctor error name:", err.name);
      console.error("Doctor error message:", err.message);

      let errorMessage = "Could not access camera/mic: ";
      if (err.name === "NotAllowedError") {
        errorMessage += "Permission denied. Please allow camera and microphone access.";
      } else if (err.name === "NotFoundError") {
        errorMessage += "No camera or microphone found.";
      } else if (err.name === "NotReadableError") {
        errorMessage += "Camera is already in use by another application.";
      } else if (err.name === "OverconstrainedError") {
        errorMessage += "Camera constraints not supported.";
      } else if (err.name === "TimeoutError") {
        errorMessage += "Timeout starting video source. Please try again.";
      } else {
        errorMessage += err.message;
      }

      setCallError(errorMessage);
    }
  };

  // Reject video call
  const rejectVideoCall = () => {
    if (!videoCallRequest) return;
    socket.emit("video_call_rejected", { to: videoCallRequest.from, from: id, role: "doctor" });
    setVideoCallRequest(null);
  };

  // Begin video call as doctor (when patient accepts)
  const beginVideoCallAsDoctor = async () => {
    try {
      console.log("Doctor starting video call...");
      setWaitingForPatient(false);
      setCallActive(true);
      setCallError("");

      // Get camera stream if we don't have it
      let stream = localStream;
      if (!stream) {
        console.log("Doctor requesting camera and microphone permissions...");
        stream = await getUserMediaWithFallback();
        console.log("Doctor got media stream:", stream);
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          console.log("Doctor set local video stream");
        }
      }

      // Create peer connection and offer
      const pc = createPeerConnection(stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log("Doctor created and set local offer");

      socket.emit("video_offer", {
        to: currentPatientId,
        from: id,
        offer,
        role: "doctor"
      });
    } catch (err) {
      console.error("Doctor failed to start video call:", err);
      setCallError("Could not start video call: " + err.message);
      setCallActive(false);
      setWaitingForPatient(false);
    }
  };

  // Helper function to create peer connection
  const createPeerConnection = (stream) => {
    console.log("Doctor creating new peer connection");

    // Close existing connection if any
    if (peerConnectionRef.current) {
      console.log("Doctor closing existing peer connection");
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    peerConnectionRef.current = pc;

    // Add local stream tracks
    if (stream) {
      stream.getTracks().forEach(track => {
        console.log("Doctor adding track to peer connection:", track.kind);
        pc.addTrack(track, stream);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log("Doctor received remote track:", event.track.kind);
      const [remote] = event.streams;
      setRemoteStream(remote);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remote;
        console.log("Doctor set remote video stream");
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Doctor sending ICE candidate");
        socket.emit("video_ice_candidate", {
          to: currentPatientId,
          from: id,
          candidate: event.candidate,
          role: "doctor"
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log("Doctor peer connection state:", pc.connectionState);
      if (pc.connectionState === 'connected') {
        console.log("Doctor video call connected successfully");
        setCallError("");
      } else if (pc.connectionState === 'failed') {
        console.log("Doctor video call connection failed");
        setCallError("Video connection failed. Please try again.");
      }
    };

    pc.onsignalingstatechange = () => {
      console.log("Doctor signaling state:", pc.signalingState);
    };

    return pc;
  };

  // End call
  const endVideoCall = () => {
    setShowVideoCall(false);
    setCallActive(false);
    setWaitingForPatient(false);
    setCallError("");
    setCurrentPatientId(null);
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    // Notify patient
    if (currentPatientId)
      socket.emit("video_call_end", { to: currentPatientId, from: id, role: "doctor" });
  };

  const handlePatientSelect = async (patient) => {
    setSelectedPatient(patient);
    try {
      const res = await axios.get(`/api/chat/${patient.patientId}/${id}`);
      setMessages(res.data);
      socket.emit("join_chat", { patientId: patient.patientId, doctorId: id });
    } catch (error) {
      console.error("Error fetching chat:", error);
      setMessages([]);
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedPatient) {
      const message = {
        patientId: selectedPatient.patientId,
        doctorId: id,
        sender: "doctor",
        content: newMessage,
      };
      socket.emit("send_message", message);
      setNewMessage("");
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log("Setting local video stream for doctor");
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Handle remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log("Setting remote video stream for doctor");
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!doctor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  console.log("Rendering doctor name:", doctor.name); // Log before render

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-float animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl animate-float animation-delay-4000"></div>
      </div>

      <header className="max-w-7xl mx-auto px-6 mb-8 relative z-10">
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Welcome, Dr. {doctor.name}
            </h1>
            <div className="text-gray-500 text-sm mt-1">Manage your patients and consultations</div>
          </div>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg shadow-md hover:from-red-600 hover:to-pink-600 transition-all duration-300"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patients List - Takes 1 column */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transform hover:-translate-y-1 transition-transform duration-300">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            Your Patients
          </h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {patients.length > 0 ? (
              patients.map((patient) => (
                <button
                  key={patient._id}
                  onClick={() => handlePatientSelect(patient)}
                  className={`w-full text-left p-4 rounded-lg shadow-md transition-all duration-300 border ${
                    selectedPatient?.patientId === patient.patientId
                      ? "bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 shadow-lg"
                      : "bg-gray-50 hover:bg-blue-50 border-gray-200 hover:border-blue-200"
                  }`}
                >
                  <p className="font-semibold text-gray-800 text-lg">{patient.name}</p>
                  <p className="text-sm text-gray-500 mt-1">ID: {patient.patientId}</p>
                  {patient.vitals && patient.vitals.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                        {patient.vitals.length} vitals
                      </span>
                    </div>
                  )}
                </button>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-2">👥</div>
                <p className="text-gray-500 italic">No patients assigned yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Patient Details & Vitals - Takes 1 column */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transform hover:-translate-y-1 transition-transform duration-300">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
            Patient Details
          </h3>
          {selectedPatient ? (
            <div className="space-y-4">
              <button
                onClick={() => {
                  setDetailsPatient(selectedPatient);
                  setShowPatientDetails(true);
                }}
                className="w-full bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200 hover:from-purple-100 hover:to-purple-200 hover:border-purple-300 transition-all duration-200 text-left"
              >
                <h4 className="font-semibold text-purple-600 text-sm mb-2 flex items-center justify-between">
                  Patient Information
                  <span className="text-purple-400">👁️</span>
                </h4>
                <p className="text-gray-800 font-semibold text-lg">{selectedPatient.name}</p>
                <p className="text-gray-600">ID: {selectedPatient.patientId}</p>
                <p className="text-xs text-purple-500 mt-2">Click to view detailed information</p>
              </button>

              {selectedPatient.vitals && selectedPatient.vitals.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-700">Latest Vitals</h4>
                  {(() => {
                    const vital = selectedPatient.vitals[selectedPatient.vitals.length - 1];
                    return (
                      <div className="grid grid-cols-1 gap-3">
                        <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">❤️</span>
                            <div>
                              <div className="text-sm font-semibold text-red-600">Heart Rate</div>
                              <div className="text-xl font-bold text-gray-800">{vital.heartRate} bpm</div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🩸</span>
                            <div>
                              <div className="text-sm font-semibold text-blue-600">Blood Pressure</div>
                              <div className="text-xl font-bold text-gray-800">{vital.bloodPressure}</div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🫁</span>
                            <div>
                              <div className="text-sm font-semibold text-green-600">Oxygen Level</div>
                              <div className="text-xl font-bold text-gray-800">{vital.oxygenLevel}%</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="text-gray-400 text-3xl mb-2">📊</div>
                  <p className="text-gray-500 italic">No vitals recorded yet</p>
                </div>
              )}

              {/* Heart Rate Data Button */}
              <div className="mt-6">
                <button
                  onClick={() => {
                    setHeartRatePatient(selectedPatient);
                    setShowHeartRateData(true);
                  }}
                  className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg shadow-md hover:from-red-600 hover:to-pink-600 transition-all duration-300 font-medium"
                >
                  <span className="mr-2">📊</span>
                  View Heart Rate Data
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">👤</div>
              <p className="text-gray-500 italic">Select a patient to view details</p>
            </div>
          )}
        </div>

        {/* Chat Section - Takes 1 column */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Chat with {selectedPatient ? selectedPatient.name : "Patient"}
          </h3>
          {/* Video Call Section */}
          <div className="mb-4">
            <button
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-400 to-purple-500 text-white rounded-lg shadow-md hover:from-blue-600 hover:to-purple-600 transition-all duration-300 disabled:opacity-50 font-medium"
              disabled={!selectedPatient || showVideoCall}
              onClick={async () => {
                if (!selectedPatient) return;
                setShowVideoCall(true);
                setWaitingForPatient(true);
                setCallError("");
                setCurrentPatientId(selectedPatient.patientId);
                socket.emit("video_call_request", {
                  to: selectedPatient.patientId,
                  from: id,
                  role: "doctor"
                });
              }}
              title={selectedPatient ? "Start a video call" : "Select a patient to enable video call"}
            >
              <span role="img" aria-label="video">📹</span> Start Video Call
            </button>
          </div>
          {/* Video Call Request Modal */}
          {videoCallRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
              <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative animate-fade-in flex flex-col items-center">
                <h2 className="text-xl font-bold mb-4 text-blue-700">Incoming Video Call</h2>
                <div className="mb-4 text-gray-700">
                  {videoCallRequest.role === "patient"
                    ? <>Patient <span className="font-semibold">{getPatientName(videoCallRequest.from)}</span> is requesting a video call.</>
                    : <>Doctor <span className="font-semibold">{videoCallRequest.from}</span> is requesting a video call.</>
                  }
                </div>
                <div className="flex gap-4">
                  <button onClick={acceptVideoCall} className="px-6 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg shadow-md text-lg">Accept</button>
                  <button onClick={rejectVideoCall} className="px-6 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg shadow-md text-lg">Reject</button>
                </div>
              </div>
            </div>
          )}
          {/* Video Call Popup */}
          <VideoCallPopup
            isOpen={showVideoCall}
            onClose={endVideoCall}
            localStream={localStream}
            remoteStream={remoteStream}
            callActive={callActive}
            waitingForOther={waitingForPatient}
            callError={callError}
            onEndCall={endVideoCall}
            onRetry={acceptVideoCall}
            otherPartyName={selectedPatient ? selectedPatient.name : videoCallRequest ? getPatientName(videoCallRequest.from) : "Patient"}
          />
          {selectedPatient ? (
            <>
              <div className="h-80 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-col-reverse" style={{scrollbarWidth: 'thin'}}>
                <div ref={messagesEndRef} />
                {messages.length === 0 && (
                  <div className="text-gray-400 text-center mt-8">No messages yet. Start the conversation!</div>
                )}
                {messages.slice().reverse().map((msg, index) => (
                  <div
                    key={index}
                    className={`mb-3 flex ${
                      msg.sender === "doctor" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs p-3 rounded-lg shadow-md ${
                        msg.sender === "doctor"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-800"
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p className="text-xs mt-1 opacity-75 text-right">
                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <form className="flex gap-2 mt-auto" onSubmit={e => { e.preventDefault(); handleSendMessage(); }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white border-gray-300"
                  maxLength={200}
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg shadow-md hover:from-green-600 hover:to-teal-600 transition-all duration-300 disabled:opacity-50 font-medium"
                  disabled={!newMessage.trim()}
                >
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">💬</div>
              <p className="text-gray-500 italic">Select a patient to start chatting</p>
            </div>
          )}
        </div>
      </main>

      {/* Heart Rate Data Viewer Modal */}
      {showHeartRateData && heartRatePatient && (
        <HeartRateDataViewer
          patientId={heartRatePatient.patientId}
          patientName={heartRatePatient.name}
          onClose={() => {
            setShowHeartRateData(false);
            setHeartRatePatient(null);
          }}
        />
      )}

      {/* Patient Details Modal */}
      {showPatientDetails && detailsPatient && (
        <PatientDetailsModal
          patient={detailsPatient}
          onClose={() => {
            setShowPatientDetails(false);
            setDetailsPatient(null);
          }}
        />
      )}
    </div>
  );
};

export default DoctorDashboard;
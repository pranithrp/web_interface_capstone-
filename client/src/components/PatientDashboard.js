
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import HeartRateMonitor from "./HeartRateMonitor";
import VideoCallPopup from "./VideoCallPopup";

const socket = io("http://localhost:5000");

// Add socket connection debugging
socket.on("connect", () => {
  console.log("Patient socket connected:", socket.id);
});

socket.on("disconnect", () => {
  console.log("Patient socket disconnected");
});

const PatientDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  // Video call state
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [callError, setCallError] = useState("");
  const [waitingForDoctor, setWaitingForDoctor] = useState(false);
  const [callRequested, setCallRequested] = useState(false);
  const [videoCallRequest, setVideoCallRequest] = useState(null); // {from: doctorId, role: "doctor"}
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);

  // Helper function to get user media with timeout and fallback constraints
  const getUserMediaWithFallback = async (timeoutMs = 10000) => {
    // Get available devices first to prefer laptop camera
    let preferredVideoDeviceId = null;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log("Available video devices:", videoDevices);

      // Prefer built-in camera (usually has "integrated" or "built-in" in label)
      const builtInCamera = videoDevices.find(device =>
        device.label.toLowerCase().includes('integrated') ||
        device.label.toLowerCase().includes('built-in') ||
        device.label.toLowerCase().includes('webcam') ||
        device.label.toLowerCase().includes('camera')
      );

      if (builtInCamera) {
        preferredVideoDeviceId = builtInCamera.deviceId;
        console.log("Using preferred camera:", builtInCamera.label);
      } else if (videoDevices.length > 0) {
        // Use the first available camera
        preferredVideoDeviceId = videoDevices[0].deviceId;
        console.log("Using first available camera:", videoDevices[0].label);
      }
    } catch (err) {
      console.log("Could not enumerate devices:", err);
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
        console.log(`Trying constraints ${i + 1}:`, constraints[i]);

        // Add timeout to getUserMedia
        const streamPromise = navigator.mediaDevices.getUserMedia(constraints[i]);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout starting video source')), timeoutMs)
        );

        const stream = await Promise.race([streamPromise, timeoutPromise]);
        console.log(`Success with constraints ${i + 1}`);
        return stream;
      } catch (err) {
        console.log(`Failed with constraints ${i + 1}:`, err.message);
        if (i === constraints.length - 1) {
          throw err; // Re-throw the last error
        }
      }
    }
  };

  // Helper function to create peer connection
  const createPeerConnection = (stream) => {
    console.log("Creating new peer connection");

    // Close existing connection if any
    if (peerConnectionRef.current) {
      console.log("Closing existing peer connection");
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
        console.log("Adding track to peer connection:", track.kind);
        pc.addTrack(track, stream);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);
      const [remote] = event.streams;
      setRemoteStream(remote);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remote;
        console.log("Set remote video stream");
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate");
        socket.emit("video_ice_candidate", {
          to: patient?.doctorId,
          from: id,
          candidate: event.candidate,
          role: "patient"
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log("Patient peer connection state:", pc.connectionState);
      if (pc.connectionState === 'connected') {
        console.log("Patient video call connected successfully");
        setCallError("");
      } else if (pc.connectionState === 'failed') {
        console.log("Patient video call connection failed");
        setCallError("Video connection failed. Please try again.");
      }
    };

    pc.onsignalingstatechange = () => {
      console.log("Patient signaling state:", pc.signalingState);
    };

    return pc;
  };

  // --- Video Call Logic ---
  // Patient initiates call request, waits for doctor to accept
  const startVideoCall = async () => {
    console.log("Patient starting video call request to doctor:", patient?.doctorId);
    console.log("Patient data:", patient);
    console.log("Socket connected:", socket.connected);
    console.log("Socket ID:", socket.id);

    if (!patient?.doctorId) {
      console.error("No doctor assigned to patient");
      setCallError("No doctor assigned");
      return;
    }

    // Request camera permissions immediately with fallback constraints
    try {
      console.log("Requesting camera and microphone permissions...");

      // Check available devices first
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log("Available devices:", devices);
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        const audioDevices = devices.filter(device => device.kind === 'audioinput');
        console.log("Video devices:", videoDevices);
        console.log("Audio devices:", audioDevices);
      } catch (deviceErr) {
        console.log("Could not enumerate devices:", deviceErr);
      }

      const stream = await getUserMediaWithFallback();
      console.log("Got media stream:", stream);
      console.log("Video tracks:", stream.getVideoTracks());
      console.log("Audio tracks:", stream.getAudioTracks());

      setLocalStream(stream);

      setShowVideoCall(true);
      setWaitingForDoctor(true);
      setCallRequested(true);
      setCallError("");

      console.log("Emitting video_call_request:", {
        to: patient.doctorId,
        from: id,
        role: "patient"
      });

      socket.emit("video_call_request", {
        to: patient.doctorId,
        from: id,
        role: "patient"
      });
    } catch (err) {
      console.error("Failed to get camera/microphone access:", err);
      console.error("Error name:", err.name);
      console.error("Error message:", err.message);

      let errorMessage = "Could not access camera/mic: ";
      if (err.name === "NotAllowedError") {
        errorMessage += "Permission denied. Please allow camera and microphone access and try again.";
      } else if (err.name === "NotFoundError") {
        errorMessage += "No camera or microphone found.";
      } else if (err.name === "NotReadableError") {
        errorMessage += "Camera is already in use by another application. Please close other applications and try again.";
      } else if (err.name === "OverconstrainedError") {
        errorMessage += "Camera constraints not supported. Please try again.";
      } else if (err.message === "Timeout starting video source") {
        errorMessage += "Timeout starting video source. Please try again.";
      } else {
        errorMessage += err.message + ". Please try again.";
      }

      setCallError(errorMessage);
    }
  };

  // When doctor accepts, start the call
  const beginVideoCall = async () => {
    setWaitingForDoctor(false);
    setCallActive(true);

    // If we already have a stream from startVideoCall, use it
    if (localStream) {
      console.log("Using existing local stream");
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
        console.log("Set existing local video stream");
      }
      return;
    }

    try {
      console.log("Requesting camera and microphone permissions for call...");

      const stream = await getUserMediaWithFallback();
      console.log("Got media stream for call:", stream);
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log("Set local video stream for call");
      }
      // Create peer connection
      const pc = createPeerConnection(stream);

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log("Created and set local offer");

      socket.emit("video_offer", {
        to: patient.doctorId,
        from: id,
        offer,
        role: "patient"
      });
    } catch (err) {
      setCallError("Could not access camera/mic: " + err.message);
    }
  };

  // Listen for signaling
  useEffect(() => {
    if (!patient?.doctorId) return;

    // Video call request from doctor
    socket.on("video_call_request", ({ from, role }) => {
      console.log("Patient received video call request from:", from, "role:", role);
      // Only show notification if it's from a doctor
      if (role === "doctor") {
        setVideoCallRequest({ from, role });
      }
    });

    // Doctor accepted call - just update UI, wait for offer
    socket.on("video_call_accepted", () => {
      console.log("Doctor accepted call, waiting for offer...");
      setWaitingForDoctor(true);
      setCallActive(false); // Will be set to true when offer is received
    });
    // Doctor rejected call
    socket.on("video_call_rejected", () => {
      setShowVideoCall(false);
      setWaitingForDoctor(false);
      setCallRequested(false);
      setCallError("Doctor rejected the video call.");
    });
    // Offer from doctor (for completeness, if doctor initiates)
    socket.on("video_offer", async ({ offer, from }) => {
      try {
        console.log("Patient received video offer from doctor");
        setShowVideoCall(true);
        setCallActive(true);
        setWaitingForDoctor(false);
        setCallError("");

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
        console.log("Patient set remote description (offer)");

        // Create and set answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log("Patient created and set local answer");
        socket.emit("video_answer", {
          to: from,
          from: id,
          answer,
          role: "patient"
        });
      } catch (err) {
        console.error("Patient could not join video call:", err);
        setCallError("Could not join video call: " + err.message);
        setCallActive(false);
        setWaitingForDoctor(false);
      }
    });
    // Answer from doctor
    socket.on("video_answer", async ({ answer, from }) => {
      try {
        if (peerConnectionRef.current && peerConnectionRef.current.signalingState === "have-local-offer") {
          console.log("Patient setting remote description (answer), current state:", peerConnectionRef.current.signalingState);
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          console.log("Patient set remote description (answer) successfully");
          // Call is now fully established
          setWaitingForDoctor(false);
          setCallActive(true);
        } else {
          console.log("Patient cannot set remote description, wrong state:", peerConnectionRef.current?.signalingState);
        }
      } catch (err) {
        console.error("Patient error setting remote description:", err);
        setCallError("Could not establish video connection: " + err.message);
      }
    });
    // ICE candidates
    socket.on("video_ice_candidate", async ({ candidate, from }) => {
      if (peerConnectionRef.current && candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("Patient added ICE candidate from:", from);
        } catch (err) {
          console.error("Patient failed to add ICE candidate:", err);
        }
      }
    });
    // End call
    socket.on("video_call_end", () => {
      endVideoCall();
    });
    return () => {
      socket.off("video_call_request");
      socket.off("video_call_accepted");
      socket.off("video_call_rejected");
      socket.off("video_offer");
      socket.off("video_answer");
      socket.off("video_ice_candidate");
      socket.off("video_call_end");
    };
    // eslint-disable-next-line
  }, [patient?.doctorId]);

  // Accept video call from doctor
  const acceptVideoCall = async () => {
    if (!videoCallRequest) return;

    try {
      console.log("Patient requesting camera and microphone permissions...");
      const stream = await getUserMediaWithFallback();
      console.log("Patient got media stream:", stream);
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log("Patient set local video stream");
      }

      setShowVideoCall(true);
      setCallActive(true);
      setWaitingForDoctor(true);
      setVideoCallRequest(null);
      socket.emit("video_call_accepted", { to: videoCallRequest.from, from: id, role: "patient" });
      // Wait for offer from doctor, then handle in signaling above
    } catch (err) {
      console.error("Patient failed to get camera/microphone access:", err);
      setCallError("Could not access camera/microphone: " + err.message);
    }
  };

  // Reject video call from doctor
  const rejectVideoCall = () => {
    if (!videoCallRequest) return;
    socket.emit("video_call_rejected", { to: videoCallRequest.from, from: id, role: "patient" });
    setVideoCallRequest(null);
  };

  const endVideoCall = () => {
    setShowVideoCall(false);
    setCallActive(false);
    setWaitingForDoctor(false);
    setCallRequested(false);
    setCallError("");
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    socket.emit("video_call_end", { to: patient.doctorId, from: id, role: "patient" });
  };
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setIsLoading(true);
        setError("");
        const res = await axios.get(`/api/patient/${id}`);
        console.log("Patient data loaded:", res.data);
        setPatient(res.data);

        // Join patient's individual room to receive video call requests
        console.log("Patient joining individual room:", id);
        socket.emit("join_patient_room", { patientId: id });

        // Fetch chat history only if doctorId exists
        if (res.data.doctorId) {
          const chatRes = await axios.get(`/api/chat/${id}/${res.data.doctorId}`);
          setMessages(chatRes.data);
          socket.emit("join_chat", { patientId: id, doctorId: res.data.doctorId });
        } else {
          setMessages([]); // Reset messages if no doctor
        }
      } catch (error) {
        setError("Could not load patient data. Please try again later.");
        if (error.response?.status === 404 && error.config.url.includes("/api/patient")) {
          navigate("/");
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchPatient();

    socket.on("receive_message", (message) => {
      setMessages((prev) => [...prev, message]);
    });
    return () => socket.off("receive_message");
  }, [id, navigate]);

  const handleSendMessage = () => {
    if (newMessage.trim() && patient?.doctorId) {
      const message = {
        patientId: id,
        doctorId: patient.doctorId,
        sender: "patient",
        content: newMessage,
        timestamp: new Date().toISOString(),
      };
      socket.emit("send_message", message);
      setMessages((prev) => [...prev, message]);
      setNewMessage("");
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log("Setting local video stream for patient");
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Handle remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log("Setting remote video stream for patient");
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (isLoading) {
    // Loading skeleton
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
        <div className="space-y-6 w-full max-w-2xl animate-pulse">
          <div className="h-12 bg-white rounded-xl shadow-lg" />
          <div className="h-40 bg-white rounded-2xl shadow-xl" />
          <div className="h-40 bg-white rounded-2xl shadow-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg shadow-md">Retry</button>
        </div>
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

  // Dynamic greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };



  // Profile modal
  const ProfileModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative animate-fade-in">
        <button className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-xl" onClick={() => setShowProfile(false)}>&times;</button>
        <h2 className="text-2xl font-bold mb-4 text-blue-700">Patient Profile</h2>
        <div className="space-y-2">
          <div><span className="font-semibold text-purple-600">Name:</span> {patient.name}</div>
          <div><span className="font-semibold text-purple-600">ID:</span> {patient.patientId}</div>
          <div><span className="font-semibold text-purple-600">Doctor:</span> {patient.doctorId || "Unassigned"}</div>
          <div><span className="font-semibold text-purple-600">Vitals Count:</span> {patient.vitals.length}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-float animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl animate-float animation-delay-4000"></div>
      </div>

      {showProfile && <ProfileModal />}
      <header className="max-w-7xl mx-auto px-6 mb-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-lg gap-4 md:gap-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              {getGreeting()}, {patient.name}!
            </h1>
            <div className="text-gray-500 text-sm mt-1">Welcome to your health dashboard</div>
          </div>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg shadow-md hover:from-red-600 hover:to-pink-600 transition-all duration-300"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Latest Vitals Section - Takes 2 columns */}
        <section className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transform hover:-translate-y-1 transition-transform duration-300">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            Latest Vitals
          </h2>
          <div className="mb-6">
            <HeartRateMonitor
              currentHeartRate={patient.vitals.length > 0 ? patient.vitals[patient.vitals.length - 1].heartRate : 72}
            />
          </div>
          {patient.vitals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(() => {
                const vital = patient.vitals[patient.vitals.length - 1];
                return [
                  <div key="hr" className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl shadow-lg border border-red-200 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">❤️</div>
                      <div>
                        <div className="text-sm font-semibold text-red-600 mb-1">Heart Rate</div>
                        <div className="text-2xl font-bold text-gray-800">{vital.heartRate} <span className="text-lg text-gray-600">bpm</span></div>
                        <div className="text-xs text-red-500 mt-1">Real-time</div>
                      </div>
                    </div>
                  </div>,
                  <div key="bp" className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-lg border border-blue-200 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">🩸</div>
                      <div>
                        <div className="text-sm font-semibold text-blue-600 mb-1">Blood Pressure</div>
                        <div className="text-2xl font-bold text-gray-800">{vital.bloodPressure}</div>
                        <div className="text-xs text-blue-500 mt-1">mmHg</div>
                      </div>
                    </div>
                  </div>,
                  <div key="ox" className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl shadow-lg border border-purple-200 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">🫁</div>
                      <div>
                        <div className="text-sm font-semibold text-purple-600 mb-1">Oxygen Level</div>
                        <div className="text-2xl font-bold text-gray-800">{vital.oxygenLevel} <span className="text-lg text-gray-600">%</span></div>
                        <div className="text-xs text-purple-500 mt-1">SpO2</div>
                      </div>
                    </div>
                  </div>
                ];
              })()}
            </div>
          ) : (
            <p className="text-gray-500 italic text-center py-8">
              No vitals recorded yet. Stay tuned for updates!
            </p>
          )}
        </section>

        {/* Patient Info Section - Takes 1 column */}
        <aside className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transform hover:-translate-y-1 transition-transform duration-300 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
              Patient Info
            </h3>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                <span className="font-medium text-purple-600 text-sm">Patient ID</span>
                <p className="text-gray-800 font-semibold text-lg">{patient.patientId}</p>
              </div>
              <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-4 rounded-lg border border-indigo-200">
                <span className="font-medium text-indigo-600 text-sm">Assigned Doctor</span>
                <p className="text-gray-800 font-semibold text-lg">{patient.doctorId || "Unassigned"}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowProfile(true)}
            className="w-full mt-6 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg shadow-md hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 font-medium"
          >
            View Full Profile
          </button>
        </aside>

        {/* Chat Section - Takes 1 column */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Chat with Doctor
          </h3>
          <button
            className="mb-4 px-4 py-3 bg-gradient-to-r from-blue-400 to-purple-500 text-white rounded-lg shadow-md hover:from-blue-600 hover:to-purple-600 transition-all duration-300 disabled:opacity-50 font-medium"
            disabled={!patient.doctorId || showVideoCall}
            onClick={startVideoCall}
            title={patient.doctorId ? "Start a video call" : "Assign a doctor to enable video call"}
          >
            <span role="img" aria-label="video">📹</span> Start Video Call
          </button>
          <div className="h-80 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg flex flex-col-reverse border border-gray-200" style={{scrollbarWidth: 'thin'}}>
            <div ref={messagesEndRef} />
            {messages.length === 0 && (
              <div className="text-gray-400 text-center mt-8">No messages yet. Start the conversation!</div>
            )}
            {messages.slice().reverse().map((msg, index) => (
              <div
                key={index}
                className={`mb-3 flex ${msg.sender === "patient" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs p-3 rounded-lg shadow-md ${msg.sender === "patient" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"}`}
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
              placeholder={patient.doctorId ? "Type a message..." : "No doctor assigned"}
              className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              disabled={!patient.doctorId}
              maxLength={200}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg shadow-md hover:from-green-600 hover:to-teal-600 transition-all duration-300 disabled:opacity-50"
              disabled={!newMessage.trim() || !patient.doctorId}
              title={patient.doctorId ? "Send" : "Assign a doctor to chat"}
            >
              Send
            </button>
          </form>
          {!patient.doctorId && (
            <p className="text-sm text-gray-500 mt-2 text-center">No doctor assigned yet.</p>
          )}

          {/* Video Call Request Modal */}
          {videoCallRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
              <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative animate-fade-in flex flex-col items-center">
                <h2 className="text-xl font-bold mb-4 text-blue-700">Incoming Video Call</h2>
                <div className="mb-4 text-gray-700">
                  {videoCallRequest.role === "doctor"
                    ? <>Your doctor is requesting a video call.</>
                    : <>Patient <span className="font-semibold">{videoCallRequest.from}</span> is requesting a video call.</>
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
            waitingForOther={waitingForDoctor}
            callError={callError}
            onEndCall={endVideoCall}
            onRetry={startVideoCall}
            otherPartyName={patient?.doctorId ? `Dr. ${patient.doctorId}` : "Doctor"}
          />
        </div>
      </main>
    </div>
  );
};

export default PatientDashboard;
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import VideoCallPopup from "./VideoCallPopup";
import HeartRateDataViewer from "./HeartRateDataViewer";
import HeartRateChart from "./HeartRateChart";
import PatientDetailsModal from "./PatientDetailsModal";
import HistoricalFilesViewer from "./HistoricalFilesViewer";

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
  const [showHistoricalFiles, setShowHistoricalFiles] = useState(false);
  const [historicalFilesPatient, setHistoricalFilesPatient] = useState(null);
  // Live patient monitoring state
  const [patientCondition, setPatientCondition] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [heartRateHistory, setHeartRateHistory] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [showFingerPlacementAlert, setShowFingerPlacementAlert] = useState(false);
  // CSV Heart Rate state
  const [csvHeartRate, setCsvHeartRate] = useState(null);
  const [csvHeartRateError, setCsvHeartRateError] = useState("");
  // Alert system state
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [alertSound, setAlertSound] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastAlertTime, setLastAlertTime] = useState({});
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
    // Add near other socket.on(...) handlers

// Listen for capstone threat alerts
    socket.on("threat_alert", (payload) => {
      console.log("Received threat_alert:", payload);

      // Show only a concise title and the detection time
      const title = payload.severity === 'high' ? '⚠️ Threat detected' : 'ℹ️ Alert';
      const timeStr = payload && payload.timestamp ? new Date(payload.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();

      if (window.showToast) {
        // Send only title + time to the toast system
        window.showToast({ title, message: timeStr, severity: payload.severity });
      } else {
        // eslint-disable-next-line no-alert
        alert(`${title}\n\n${timeStr}`);
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

  // Check camera/microphone permissions
  const checkMediaPermissions = async () => {
    try {
      if (!navigator.permissions) {
        return { camera: 'unknown', microphone: 'unknown' };
      }
      
      const cameraPermission = await navigator.permissions.query({ name: 'camera' });
      const microphonePermission = await navigator.permissions.query({ name: 'microphone' });
      
      return {
        camera: cameraPermission.state,
        microphone: microphonePermission.state
      };
    } catch (err) {
      console.log('Permission check not supported:', err);
      return { camera: 'unknown', microphone: 'unknown' };
    }
  };

  // Check browser compatibility
  const checkBrowserCompatibility = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isChrome = userAgent.includes('chrome') && !userAgent.includes('edge');
    const isFirefox = userAgent.includes('firefox');
    const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');
    const isEdge = userAgent.includes('edge');
    
    // Check if it's a secure context (HTTPS or localhost)
    const isSecure = window.location.protocol === 'https:' || 
                     window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
    
    console.log('🌐 Doctor Browser info:', {
      userAgent: navigator.userAgent,
      isChrome, isFirefox, isSafari, isEdge,
      isSecure,
      hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    });
    
    return {
      isSupported: (isChrome || isFirefox || isSafari || isEdge) && isSecure,
      isSecure,
      browser: isChrome ? 'Chrome' : isFirefox ? 'Firefox' : isSafari ? 'Safari' : isEdge ? 'Edge' : 'Unknown'
    };
  };

  // Helper function to get user media with timeout and fallback constraints
  const getUserMediaWithFallback = async (timeoutMs = 10000) => {
    console.log('🎥 Doctor starting getUserMedia request...');
    
    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Your browser does not support video calls. Please use Chrome, Firefox, or Safari.');
    }

    // Check current permissions
    const permissions = await checkMediaPermissions();
    console.log('📋 Doctor Current permissions:', permissions);

    // Try simple constraints first - most permissive
    const constraints = [
      // Most basic - just request any video and audio
      { video: true, audio: true },      
      // Video only if audio fails
      { video: true, audio: false },
      // Try with basic video constraints (sometimes helps with permission issues)
      {
        video: { 
          width: { min: 320, ideal: 640, max: 1280 },
          height: { min: 240, ideal: 480, max: 720 }
        },
        audio: true
      },
      // Last resort - very minimal
      {
        video: { width: 320, height: 240 },
        audio: false
      }
    ];

    for (let i = 0; i < constraints.length; i++) {
      try {
        console.log(`🎥 Doctor trying constraint ${i + 1}:`, constraints[i]);
        
        const stream = await Promise.race([
          navigator.mediaDevices.getUserMedia(constraints[i]),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timed out after 10 seconds')), timeoutMs)
          )
        ]);
        
        console.log(`✅ Doctor Success! Got stream with ${stream.getVideoTracks().length} video tracks and ${stream.getAudioTracks().length} audio tracks`);
        
        // Log track settings for debugging
        stream.getVideoTracks().forEach(track => {
          console.log('📹 Doctor Video track settings:', track.getSettings());
        });
        stream.getAudioTracks().forEach(track => {
          console.log('🎤 Doctor Audio track settings:', track.getSettings());
        });
        
        return stream;
        
      } catch (err) {
        console.log(`❌ Doctor constraint ${i + 1} failed:`, err.name, err.message);
        
        // If user denied permission, don't try other constraints
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          throw new Error('Camera and microphone access was denied. Please:\n1. Click the camera icon in your browser address bar\n2. Change to "Allow"\n3. Refresh the page and try again');
        }
        
        // If no devices found
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          if (i >= 1) { // After trying basic constraints
            throw new Error('No camera or microphone found. Please connect a webcam with microphone and try again.');
          }
        }
        
        // If secure context required (HTTPS)
        if (err.name === 'NotSupportedError') {
          throw new Error('Video calls require a secure connection. Please access the site via HTTPS.');
        }
        
        // Continue to next constraint if not the last one
        if (i === constraints.length - 1) {
          throw new Error(`Unable to access camera/microphone: ${err.message}`);
        }
      }
    }
  };

  // Start video call - doctor initiates call to patient
  const startVideoCall = async () => {
    if (!selectedPatient) return;

    // Check browser compatibility first
    const browserCheck = checkBrowserCompatibility();
    if (!browserCheck.isSupported) {
      const message = !browserCheck.isSecure 
        ? 'Video calls require a secure connection (HTTPS). Please access the site securely.'
        : `Video calls work best in Chrome, Firefox, Safari, or Edge. You're using: ${browserCheck.browser}`;
      setCallError(message);
      alert(message);
      return;
    }

    try {
      console.log("Doctor initiating video call to patient:", selectedPatient._id);
      
      // Clear any previous errors
      setCallError("");
      
      // Request permission and get media stream
      const stream = await getUserMediaWithFallback();
      console.log("Doctor got media stream for call initiation:", stream);

      // Set local stream and show video call popup
      setLocalStream(stream);
      setShowVideoCall(true);

      // Emit video call request to patient
      socket.emit('video_call_request', {
        fromId: currentDoctor._id,
        fromName: currentDoctor.name,
        fromType: 'doctor',
        toId: selectedPatient._id,
        toType: 'patient'
      });

      console.log("Video call request sent to patient");
    } catch (error) {
      console.error("Error starting video call:", error);
      setCallError(error.message);
      
      // Show a more user-friendly error dialog
      if (!error.message.includes('timed out')) {
        alert(`Video Call Setup Failed:\n\n${error.message}\n\nNeed help?\n• Make sure your camera and microphone are connected\n• Allow permissions when your browser asks\n• Try refreshing the page\n• Use Chrome, Firefox, or Safari for best results`);
      }
    }
  };

  // Accept video call
  const acceptVideoCall = async () => {
    if (!videoCallRequest) return;

    // Check browser compatibility first
    const browserCheck = checkBrowserCompatibility();
    if (!browserCheck.isSupported) {
      const message = !browserCheck.isSecure 
        ? 'Video calls require a secure connection (HTTPS). Please access the site securely.'
        : `Video calls work best in Chrome, Firefox, Safari, or Edge. You're using: ${browserCheck.browser}`;
      setCallError(message);
      alert(message);
      return;
    }

    try {
      console.log("Doctor requesting camera and microphone permissions...");

      // Clear any previous errors
      setCallError("");

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
      setCallError(err.message);
    }
  };

  // Test camera and microphone function
  const testCameraAndMic = async () => {
    // Check browser compatibility first
    const browserCheck = checkBrowserCompatibility();
    if (!browserCheck.isSupported) {
      const message = !browserCheck.isSecure 
        ? 'Video calls require a secure connection (HTTPS). Please access the site securely.'
        : `Video calls work best in Chrome, Firefox, Safari, or Edge. You're using: ${browserCheck.browser}`;
      alert(message);
      return;
    }

    try {
      setCallError("Testing camera and microphone...");
      console.log("🧪 Doctor testing camera and microphone...");
      
      const stream = await getUserMediaWithFallback();
      console.log("✅ Doctor camera and microphone test successful!");
      
      // Show success message with details
      const videoTracks = stream.getVideoTracks().length;
      const audioTracks = stream.getAudioTracks().length;
      
      let message = `✅ Camera and Microphone Test Successful!\n\n`;
      message += `📹 Video tracks: ${videoTracks}\n`;
      message += `🎤 Audio tracks: ${audioTracks}\n\n`;
      message += `Your video call setup is working correctly!`;
      
      alert(message);
      setCallError("");
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());
      
    } catch (err) {
      console.error("❌ Doctor camera/microphone test failed:", err);
      setCallError(err.message);
      
      let message = `❌ Camera and Microphone Test Failed:\n\n${err.message}\n\n`;
      message += `Need help?\n`;
      message += `• Make sure your camera and microphone are connected\n`;
      message += `• Allow permissions when your browser asks\n`;
      message += `• Try refreshing the page\n`;
      message += `• Use Chrome, Firefox, or Safari for best results`;
      
      alert(message);
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
    console.log("👨‍⚕️ Doctor creating new peer connection");

    // Close existing connection if any
    if (peerConnectionRef.current) {
      console.log("🔒 Doctor closing existing peer connection");
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        // Add TURN servers for better connectivity
        {
          urls: 'turn:numb.viagenie.ca',
          credential: 'muazkh',
          username: 'webrtc@live.com'
        }
      ],
      iceCandidatePoolSize: 10
    });

    peerConnectionRef.current = pc;

    // Add local stream tracks with improved configuration
    if (stream) {
      stream.getTracks().forEach(track => {
        console.log("➕ Doctor adding track to peer connection:", track.kind, track.getSettings());
        const sender = pc.addTrack(track, stream);
        
        // Configure encoding parameters for better quality
        if (track.kind === 'video') {
          const params = sender.getParameters();
          if (params.encodings) {
            params.encodings[0].maxBitrate = 1000000; // 1 Mbps max
            params.encodings[0].scaleResolutionDownBy = 1;
            sender.setParameters(params);
          }
        }
      });
    }

    // Handle remote stream with enhanced logging
    pc.ontrack = (event) => {
      console.log("📺 Doctor received remote track:", event.track.kind, event.streams.length);
      const [remote] = event.streams;
      setRemoteStream(remote);
      
      // Enhanced remote stream handling
      remote.onaddtrack = (e) => {
        console.log("🎵 Doctor: Remote stream added track:", e.track.kind);
      };
      
      remote.onremovetrack = (e) => {
        console.log("🚫 Doctor: Remote stream removed track:", e.track.kind);
      };
    };

    // Enhanced ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("🧊 Doctor sending ICE candidate:", event.candidate.type, event.candidate.protocol);
        socket.emit("video_ice_candidate", {
          to: currentPatientId,
          from: id,
          candidate: event.candidate,
          role: "doctor"
        });
      } else {
        console.log("🧊 Doctor ICE gathering completed");
      }
    };

    // Handle ICE gathering state
    pc.onicegatheringstatechange = () => {
      console.log("❄️ Doctor ICE gathering state:", pc.iceGatheringState);
    };

    // Handle ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log("🧊 Doctor ICE connection state:", pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        setCallError("Connection lost. Attempting to reconnect...");
      } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setCallError("");
      }
    };

    // Handle connection state changes with detailed logging
    pc.onconnectionstatechange = () => {
      console.log("🔗 Doctor peer connection state:", pc.connectionState);
      
      switch (pc.connectionState) {
        case 'connecting':
          console.log("🔄 Doctor connecting to patient...");
          break;
        case 'connected':
          console.log("✅ Doctor video call connected successfully");
          setCallError("");
          setWaitingForPatient(false);
          setCallActive(true);
          break;
        case 'disconnected':
          console.log("⚠️ Doctor connection temporarily lost");
          setCallError("Connection temporarily lost. Reconnecting...");
          break;
        case 'failed':
          console.log("❌ Doctor video call connection failed");
          setCallError("Video connection failed. Please check your network and try again.");
          break;
        case 'closed':
          console.log("🔒 Doctor connection closed");
          setCallActive(false);
          break;
      }
    };

    // Handle signaling state changes
    pc.onsignalingstatechange = () => {
      console.log("📡 Doctor signaling state:", pc.signalingState);
    };

    // Handle datachannel for future features
    pc.ondatachannel = (event) => {
      console.log("📞 Doctor data channel received:", event.channel.label);
      const channel = event.channel;
      
      channel.onopen = () => console.log("📞 Doctor data channel opened");
      channel.onclose = () => console.log("📞 Doctor data channel closed");
      channel.onmessage = (event) => console.log("📞 Doctor data channel message:", event.data);
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

  // Live patient monitoring listener - Abnormality alerts only (no finger placement popup)
  useEffect(() => {
    socket.on("patient_condition", (data) => {
      console.log("Doctor received patient condition data:", data);
      
      // ⚠️ DOCTOR DASHBOARD: Don't show finger placement alert
      // The patient dashboard handles the finger placement alert
      // Doctor only gets the abnormality notification through checkVitalLimits
      
      // Always clear CSV data (CSV is completely disabled)
      setCsvHeartRate(null);
      
      // Update patient condition (even with zero values to trigger abnormality alerts)
      setPatientCondition(data);
      
      // Update heart rate history for graphing
      setHeartRateHistory(prev => {
        const newHistory = [...prev, {
          timestamp: new Date(data.timestamp),
          heart_rate: data.heart_rate,
          spo2: data.spo2, // Add SpO2 to history
          abnormality: data.abnormality,
          prediction: data.prediction,
          condition: data.condition,
          confidence: data.confidence,
          data_source: data.data_source
        }];
        // Keep only last 15 readings to avoid clustering
        return newHistory.slice(-15);
      });
      
      // Add warnings to the warnings array
      if (data.abnormality) {
        setWarnings(prev => {
          const newWarning = {
            id: Date.now(),
            timestamp: new Date(data.timestamp),
            type: data.abnormality.type,
            severity: data.abnormality.severity,
            message: data.abnormality.message,
            heart_rate: data.heart_rate
          };
          // Keep only last 20 warnings
          return [newWarning, ...prev.slice(0, 19)];
        });
      }

      // Check for vital limit alerts
      const newAlerts = checkVitalLimits(data);
      if (newAlerts.length > 0) {
        setActiveAlerts(prev => {
          const updated = [...prev];
          newAlerts.forEach(alert => {
            // Check if this type of alert already exists for this patient
            const existingIndex = updated.findIndex(existing => 
              existing.vital === alert.vital && 
              existing.patient === alert.patient &&
              existing.type === alert.type
            );
            
            if (existingIndex >= 0) {
              // Update existing alert with new value and timestamp
              updated[existingIndex] = alert;
            } else {
              // Add new alert
              updated.push(alert);
            }
          });
          
          // Keep only last 10 alerts
          return updated.slice(-10);
        });

        // Play sound for the most severe alert
        const hasCritical = newAlerts.some(alert => alert.type === 'critical');
        playAlertSound(hasCritical ? 'critical' : 'warning');
      }
    });

    return () => {
      socket.off("patient_condition");
    };
  }, []);

  // Fetch CSV heart rate data for selected patient every 5 seconds
  // 🚫 CSV FETCHING COMPLETELY DISABLED - ONLY USE ESP8266 SENSOR DATA
  useEffect(() => {
    // CSV fetching is now completely disabled
    // We ONLY use ESP8266 sensor data
    console.log("🚫 CSV fetching DISABLED - Using ESP8266 sensor data only");
    setCsvHeartRate(null); // Always clear CSV data
    setCsvHeartRateError("CSV data disabled - Using ESP8266 sensor only");
    
    // OLD CODE (COMPLETELY DISABLED):
    /*
    const fetchCsvHeartRate = async () => {
      if (!selectedPatient?.patientId) return;

      // 🔴 STOP CSV FETCHING WHEN ESP8266 IS ACTIVE - Priority: ESP8266 > CSV
      if (patientCondition?.data_source === 'esp8266_sensor') {
        console.log('🛑 CSV fetch skipped - ESP8266 sensor is active');
        setCsvHeartRate(null);
        return;
      }

      try {
        const response = await axios.get(`/api/patient/${selectedPatient.patientId}/current-heart-rate`);
        setCsvHeartRate(response.data);
        setCsvHeartRateError("");
      } catch (error) {
        console.error("Error fetching CSV heart rate:", error);
        setCsvHeartRateError("No CSV data available");
      }
    };

    // Fetch immediately when selectedPatient changes
    if (selectedPatient?.patientId) {
      fetchCsvHeartRate();
    }

    // Set up interval to fetch every 5 seconds
    const interval = setInterval(fetchCsvHeartRate, 5000);

    return () => clearInterval(interval);
    */
  }, [selectedPatient?.patientId, patientCondition?.data_source]);

  // Alert System Functions
  const createAlertSound = () => {
    try {
      // Create a more urgent alert sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // High frequency for urgency
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.4);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + 0.4);
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.6);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.6);
      
      return audioContext;
    } catch (error) {
      console.warn("Could not create alert sound:", error);
      return null;
    }
  };

  const checkVitalLimits = (condition) => {
    const alerts = [];
    const now = Date.now();
    const patientId = selectedPatient?.patientId || 'unknown';
    
    // ⚠️ Invalid sensor reading - Create abnormality alert (not finger placement alert)
    if (condition.data_source === 'esp8266_sensor' && 
        (condition.heart_rate === 0 || condition.spo2 === 0)) {
      console.log("🚨 Invalid sensor reading detected - creating ABNORMALITY alert");
      
      alerts.push({
        id: `invalid_reading_${now}`,
        type: 'critical',
        vital: 'Sensor Reading',
        value: 0,
        message: `CRITICAL ABNORMALITY: Invalid sensor reading detected (HR=${condition.heart_rate}, SpO2=${condition.spo2})`,
        patient: selectedPatient?.name || 'Unknown Patient',
        timestamp: now
      });
      
      // Trigger alert sound for invalid readings
      const shouldAlert = (type) => {
        const lastAlert = lastAlertTime[`${patientId}_${type}`];
        return !lastAlert || (now - lastAlert) > 10000; // 10 seconds
      };
      
      if (shouldAlert('invalid_reading')) {
        setLastAlertTime(prev => ({...prev, [`${patientId}_invalid_reading`]: now}));
      }
      
      return alerts; // Return invalid reading alert
    }
    
    // Prevent spam - only alert once every 10 seconds for same type
    const shouldAlert = (type) => {
      const lastAlert = lastAlertTime[`${patientId}_${type}`];
      return !lastAlert || (now - lastAlert) > 10000; // 10 seconds
    };

    // Heart Rate Limits
    if (condition.heart_rate && condition.heart_rate > 0) {
      if (condition.heart_rate < 50) { // Severe bradycardia
        alerts.push({
          id: `hr_low_${now}`,
          type: 'critical',
          vital: 'Heart Rate',
          value: condition.heart_rate,
          message: `CRITICAL: Heart rate dangerously low (${condition.heart_rate} bpm)`,
          patient: selectedPatient?.name || 'Unknown Patient',
          timestamp: now
        });
        if (shouldAlert('hr_low')) {
          setLastAlertTime(prev => ({...prev, [`${patientId}_hr_low`]: now}));
        }
      } else if (condition.heart_rate > 130) { // Severe tachycardia
        alerts.push({
          id: `hr_high_${now}`,
          type: 'critical',
          vital: 'Heart Rate',
          value: condition.heart_rate,
          message: `CRITICAL: Heart rate dangerously high (${condition.heart_rate} bpm)`,
          patient: selectedPatient?.name || 'Unknown Patient',
          timestamp: now
        });
        if (shouldAlert('hr_high')) {
          setLastAlertTime(prev => ({...prev, [`${patientId}_hr_high`]: now}));
        }
      } else if (condition.heart_rate < 60 && shouldAlert('hr_low_warn')) {
        alerts.push({
          id: `hr_low_warn_${now}`,
          type: 'warning',
          vital: 'Heart Rate',
          value: condition.heart_rate,
          message: `Warning: Heart rate below normal (${condition.heart_rate} bpm)`,
          patient: selectedPatient?.name || 'Unknown Patient',
          timestamp: now
        });
        setLastAlertTime(prev => ({...prev, [`${patientId}_hr_low_warn`]: now}));
      } else if (condition.heart_rate > 100 && shouldAlert('hr_high_warn')) {
        alerts.push({
          id: `hr_high_warn_${now}`,
          type: 'warning',
          vital: 'Heart Rate',
          value: condition.heart_rate,
          message: `Warning: Heart rate above normal (${condition.heart_rate} bpm)`,
          patient: selectedPatient?.name || 'Unknown Patient',
          timestamp: now
        });
        setLastAlertTime(prev => ({...prev, [`${patientId}_hr_high_warn`]: now}));
      }
    }

    // Add alerts for abnormalities detected by ML
    if (condition.abnormality && shouldAlert('abnormality')) {
      alerts.push({
        id: `abnormality_${now}`,
        type: 'critical',
        vital: 'Heart Pattern',
        value: condition.condition,
        message: `ABNORMALITY DETECTED: ${condition.abnormality.type} - ${condition.abnormality.message}`,
        patient: selectedPatient?.name || 'Unknown Patient',
        timestamp: now
      });
      setLastAlertTime(prev => ({...prev, [`${patientId}_abnormality`]: now}));
    }

    return alerts;
  };

  const playAlertSound = (alertType) => {
    if (!soundEnabled) return;
    
    try {
      if (alertType === 'critical') {
        // Play 3 beeps for critical alerts
        setTimeout(() => createAlertSound(), 0);
        setTimeout(() => createAlertSound(), 700);
        setTimeout(() => createAlertSound(), 1400);
      } else {
        // Play 1 beep for warnings
        createAlertSound();
      }
    } catch (error) {
      console.warn("Could not play alert sound:", error);
    }
  };

  const dismissAlert = (alertId) => {
    setActiveAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const dismissAllAlerts = () => {
    setActiveAlerts([]);
  };

  const toggleSound = () => {
    setSoundEnabled(prev => !prev);
  };

  // Live patient monitoring functions
  const startMonitoring = () => {
    console.log("Doctor starting patient monitoring");
    socket.emit("start_monitoring");
    setIsMonitoring(true);
    // Clear previous data
    setHeartRateHistory([]);
    setWarnings([]);
    setPatientCondition(null);
  };

  const stopMonitoring = () => {
    console.log("Doctor stopping patient monitoring");
    socket.emit("stop_monitoring");
    setIsMonitoring(false);
  };

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

      <header className="max-w-full mx-auto px-6 mb-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center bg-gradient-to-br from-white via-blue-50 to-purple-50 p-8 rounded-2xl shadow-2xl border border-gray-100 backdrop-blur-sm gap-4 md:gap-0 transform hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
              <span className="text-2xl text-white">👨‍⚕️</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-gradient-x">
                Welcome, {doctor.name}
              </h1>
              <div className="text-gray-600 text-sm mt-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Manage your patients and consultations
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-gradient-to-r from-red-500 via-pink-500 to-red-600 text-white rounded-xl shadow-lg hover:shadow-2xl hover:from-red-600 hover:via-pink-600 hover:to-red-700 transform hover:scale-105 transition-all duration-300 font-semibold"
          >
            <span className="mr-2">🚪</span>
            Logout
          </button>
        </div>
      </header>

      {/* Alert Panel - Shows critical alerts at the top */}
      {activeAlerts.length > 0 && (
        <div className="max-w-full mx-auto px-6 mb-6">
          <div className="bg-gradient-to-r from-red-50 via-orange-50 to-red-50 border-2 border-red-200 rounded-2xl shadow-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-white text-sm">🚨</span>
                </div>
                <h3 className="text-lg font-bold text-red-800">
                  CRITICAL ALERTS ({activeAlerts.length})
                </h3>
                <button
                  onClick={toggleSound}
                  className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    soundEnabled 
                      ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={soundEnabled ? 'Sound alerts enabled' : 'Sound alerts disabled'}
                >
                  {soundEnabled ? '🔊' : '🔇'} Sound {soundEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              <button
                onClick={dismissAllAlerts}
                className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-all duration-200 text-sm font-semibold"
              >
                Dismiss All
              </button>
            </div>
            
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {activeAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between p-3 rounded-xl border-l-4 ${
                    alert.type === 'critical' 
                      ? 'bg-red-100 border-red-500 text-red-900' 
                      : 'bg-yellow-100 border-yellow-500 text-yellow-900'
                  } shadow-md`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">
                        {alert.type === 'critical' ? '🚨' : '⚠️'}
                      </span>
                      <span className="font-bold text-sm">
                        {alert.patient} - {alert.vital}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        alert.type === 'critical' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'
                      }`}>
                        {alert.type.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs opacity-75">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="ml-3 w-8 h-8 bg-white bg-opacity-50 rounded-full flex items-center justify-center hover:bg-opacity-75 transition-all duration-200"
                    title="Dismiss alert"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 space-y-8">
        {/* Top Row - Patients List */}
        <div className="panel-container bg-gradient-to-br from-white via-blue-50 to-indigo-50 p-6 rounded-2xl shadow-xl border border-gray-100">
          <h2 className="panel-header text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></span>
            Your Patients
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {patients.length > 0 ? (
              patients.map((patient) => (
                <button
                  key={patient._id}
                  onClick={() => handlePatientSelect(patient)}
                  className={`text-left p-4 rounded-lg shadow-md transition-all duration-300 border ${
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
              <div className="text-center py-8 col-span-full">
                <div className="text-gray-400 text-4xl mb-2">👥</div>
                <p className="text-gray-500 italic">No patients assigned yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Middle Row - Patient Details & Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Patient Details & Vitals */}
          <div className="patient-info-panel bg-gradient-to-br from-white via-purple-50 to-pink-50 p-6 rounded-2xl shadow-xl border border-gray-100">
            <h3 className="panel-header text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></span>
              Patient Details
            </h3>
          
          {/* ⚠️ REMOVED: Finger Placement Alert (Only shown in Patient Dashboard) */}
          {/* Doctor receives abnormality notifications through the alert system instead */}
          
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
                              <div className="text-xl font-bold text-gray-800">
                                {patientCondition?.data_source === 'esp8266_sensor' 
                                  ? Math.round(patientCondition.heart_rate) 
                                  : vital.heartRate} bpm
                              </div>
                              {patientCondition?.data_source === 'esp8266_sensor' ? (
                                <div className={`text-xs font-semibold ${
                                  patientCondition.heart_rate === 0 
                                    ? 'text-red-600 animate-pulse' 
                                    : 'text-blue-600'
                                }`}>
                                  📡 ESP8266 Sensor {patientCondition.heart_rate === 0 ? '(Invalid)' : ''}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400">Static Data</div>
                              )}
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
                              <div className="text-sm font-semibold text-green-600">Oxygen Level (SpO2)</div>
                              <div className="text-xl font-bold text-gray-800">
                                {patientCondition?.data_source === 'esp8266_sensor'
                                  ? patientCondition.spo2
                                  : vital.oxygenLevel}%
                              </div>
                              {patientCondition?.data_source === 'esp8266_sensor' ? (
                                <div className={`text-xs font-semibold ${
                                  patientCondition.spo2 === 0 
                                    ? 'text-red-600 animate-pulse' 
                                    : 'text-blue-600'
                                }`}>
                                  📡 ESP8266 Sensor {patientCondition.spo2 === 0 ? '(Invalid)' : ''}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400">Static Data</div>
                              )}
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

              {/* Action Buttons */}
              <div className="mt-6 space-y-3">
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
                
                <button
                  onClick={() => {
                    setHistoricalFilesPatient(selectedPatient);
                    setShowHistoricalFiles(true);
                  }}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg shadow-md hover:from-blue-600 hover:to-purple-600 transition-all duration-300 font-medium"
                >
                  <span className="mr-2">📁</span>
                  Historical Files (FedShield)
                </button>
              </div>

              {/* Live Patient Monitoring Section */}
              <div className="mt-6 p-6 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-xl border border-purple-200 shadow-inner">
                <h4 className="text-lg font-semibold text-purple-700 mb-4 flex items-center gap-2">
                  <span className="text-xl animate-pulse">🔄</span>
                  Live Patient Monitoring
                  {isMonitoring && (
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full animate-pulse">
                      LIVE
                    </span>
                  )}
                </h4>
                
                <div className="space-y-4">
                  {!isMonitoring ? (
                    <button
                      onClick={startMonitoring}
                      className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl shadow-lg hover:from-green-600 hover:to-emerald-600 hover:shadow-xl transform hover:scale-105 transition-all duration-300 font-semibold text-lg"
                    >
                      <span className="mr-2">▶️</span>
                      Start Live Monitoring
                    </button>
                  ) : (
                    <button
                      onClick={stopMonitoring}
                      className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl shadow-lg hover:from-red-600 hover:to-pink-600 hover:shadow-xl transform hover:scale-105 transition-all duration-300 font-semibold text-lg"
                    >
                      <span className="mr-2">⏹️</span>
                      Stop Monitoring
                    </button>
                  )}
                  
                  {/* Real-time Heart Rate Display */}
                  {patientCondition && (
                    <div className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-md">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-700">Current Reading</span>
                        <span className="text-xs text-gray-500">
                          {new Date(patientCondition.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      {/* Heart Rate Display */}
                      <div className={`text-center p-4 rounded-lg ${
                        patientCondition.abnormality?.severity === 'critical' 
                          ? 'bg-red-100 border-2 border-red-300' 
                          : patientCondition.abnormality?.severity === 'warning'
                          ? 'bg-yellow-100 border-2 border-yellow-300'
                          : 'bg-green-100 border-2 border-green-300'
                      }`}>
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <span className="text-2xl">❤️</span>
                          <span className={`text-3xl font-bold ${
                            patientCondition.abnormality?.severity === 'critical' 
                              ? 'text-red-600' 
                              : patientCondition.abnormality?.severity === 'warning'
                              ? 'text-yellow-600'
                              : 'text-green-600'
                          }`}>
                            {patientCondition.heart_rate}
                          </span>
                          <span className="text-lg text-gray-600">bpm</span>
                        </div>
                        
                        {/* SpO2 Display */}
                        {patientCondition.spo2 && (
                          <div className="flex items-center justify-center gap-2 mb-2 mt-3 pt-3 border-t border-gray-300">
                            <span className="text-2xl">🫁</span>
                            <span className="text-2xl font-bold text-blue-600">
                              {patientCondition.spo2}
                            </span>
                            <span className="text-sm text-gray-600">% SpO2</span>
                          </div>
                        )}
                        
                        {/* Data Source Badge */}
                        {patientCondition.data_source === 'esp8266_sensor' && (
                          <div className="mt-2 inline-block px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full">
                            📡 ESP8266 Sensor
                          </div>
                        )}
                        
                        {patientCondition.abnormality && (
                          <div className={`text-sm font-semibold mt-2 ${
                            patientCondition.abnormality.severity === 'critical' 
                              ? 'text-red-700' 
                              : 'text-yellow-700'
                          }`}>
                            ⚠️ {patientCondition.abnormality.type.toUpperCase()}
                          </div>
                        )}
                      </div>
                      
                      {/* Status and Patient Info */}
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <div className="text-gray-500">Patient</div>
                          <div className="font-semibold">{patientCondition.patient_id}</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <div className="text-gray-500">Status</div>
                          <div className={`font-semibold ${
                            patientCondition.abnormality ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {patientCondition.abnormality ? 'Abnormal' : 'Normal'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Heart Rate Chart */}
                  {heartRateHistory.length > 1 && (
                    <div className="col-span-2">
                      <HeartRateChart 
                        heartRateHistory={heartRateHistory} 
                        patientCondition={patientCondition}
                      />
                    </div>
                  )}
                  
                  {/* Warnings Panel */}
                  {warnings.length > 0 && (
                    <div className="bg-white p-4 rounded-xl border border-orange-200 shadow-md">
                      <div className="text-sm font-semibold text-orange-700 mb-2 flex items-center gap-1">
                        <span>⚠️</span>
                        Recent Warnings ({warnings.length})
                      </div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {warnings.slice(0, 5).map((warning) => (
                          <div key={warning.id} className={`text-xs p-2 rounded ${
                            warning.severity === 'critical' 
                              ? 'bg-red-50 border border-red-200 text-red-700'
                              : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                          }`}>
                            <div className="font-semibold">{warning.type.toUpperCase()}</div>
                            <div>{warning.heart_rate} bpm</div>
                            <div className="text-gray-500">
                              {warning.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">👤</div>
              <p className="text-gray-500 italic">Select a patient to view details</p>
            </div>
          )}
          </div>

          {/* Chat Section */}
          <div className="chat-panel bg-gradient-to-br from-white via-green-50 to-emerald-50 p-6 rounded-2xl shadow-xl border border-gray-100 flex flex-col">
            <h3 className="panel-header text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
              Chat with {selectedPatient ? selectedPatient.name : "Patient"}
            </h3>
          {/* Video Call Section */}
          <div className="mb-4 space-y-2">
            <button
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-400 to-purple-500 text-white rounded-lg shadow-md hover:from-blue-600 hover:to-purple-600 transition-all duration-300 disabled:opacity-50 font-medium"
              disabled={!selectedPatient || showVideoCall}
              onClick={startVideoCall}
              title={selectedPatient ? "Start a video call" : "Select a patient to enable video call"}
            >
              <span role="img" aria-label="video">📹</span> Start Video Call
            </button>
            <button
              className="w-full px-3 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg shadow-md hover:from-gray-600 hover:to-gray-700 transition-all duration-300 font-medium text-sm"
              onClick={testCameraAndMic}
              title="Test your camera and microphone setup"
            >
              <span role="img" aria-label="test">🧪</span> Test Camera & Mic
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
            peerConnection={peerConnectionRef.current}
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
        </div>
      </main>

      {/* Heart Rate Data Viewer Modal */}
      {showHeartRateData && heartRatePatient && (
        <HeartRateDataViewer
          patientId={heartRatePatient.patientId}
          patientName={heartRatePatient.name}
          warnings={warnings}
          heartRateHistory={heartRateHistory}
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

      {/* Historical Files Viewer Modal */}
      {showHistoricalFiles && historicalFilesPatient && (
        <HistoricalFilesViewer
          patientId={historicalFilesPatient.patientId}
          patientName={historicalFilesPatient.name}
          onClose={() => {
            setShowHistoricalFiles(false);
            setHistoricalFilesPatient(null);
          }}
        />
      )}
    </div>
  );
};

export default DoctorDashboard;
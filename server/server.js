const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const apiRoutes = require("./Routes/api");
const axios = require("axios");

const app = express();
const server = http.createServer(app);
const path = require("path");

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Frontend URL (corrected port)
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect("mongodb://localhost:27017/rpm_db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Socket.io Setup
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Live patient monitoring feature
  let monitoringInterval = null;

  socket.on("start_monitoring", async () => {
    if (monitoringInterval) return; // Prevent multiple intervals
    monitoringInterval = setInterval(async () => {
      try {
        const response = await axios.get("http://localhost:5001/api/get_streaming_data");
        // Emit the received data to the client
        socket.emit("patient_condition", response.data);
      } catch (error) {
        console.error("Error fetching ML data:", error.message);
      }
    }, 2000);
  });

  socket.on("stop_monitoring", () => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
    }
  });


  // Join a room based on patient-doctor pair
  socket.on("join_chat", ({ patientId, doctorId }) => {
    const room = `${patientId}-${doctorId}`;
    socket.join(room);
    socket.join(patientId);
    socket.join(doctorId);
    console.log(`User joined room: ${room}`);
  });

  // Join doctor's individual room for receiving video call requests
  socket.on("join_doctor_room", ({ doctorId }) => {
    socket.join(doctorId);
    console.log(`Doctor ${doctorId} joined their individual room`);
  });

  // Join patient's individual room for receiving video call requests
  socket.on("join_patient_room", ({ patientId }) => {
    socket.join(patientId);
    console.log(`Patient ${patientId} joined their individual room`);
  });

  // Video call signaling events
  // Video call request
  socket.on("video_call_request", ({ to, from, role }) => {
    // to: patientId or doctorId, from: other party's id
    console.log(`Video call request from ${from} (${role}) to ${to}`);
    console.log(`Emitting to room: ${to}`);
    console.log(`Rooms for socket ${socket.id}:`, Array.from(socket.rooms));

    // Get all sockets in the target room
    const socketsInRoom = io.sockets.adapter.rooms.get(to);
    console.log(`Sockets in room ${to}:`, socketsInRoom ? Array.from(socketsInRoom) : 'No sockets');

    io.to(to).emit("video_call_request", { from, role });
  });

  // Video call accepted
  socket.on("video_call_accepted", ({ to, from, role }) => {
    io.to(to).emit("video_call_accepted", { from, role });
  });

  // Video call rejected
  socket.on("video_call_rejected", ({ to, from, role }) => {
    io.to(to).emit("video_call_rejected", { from, role });
  });

  // WebRTC offer
  socket.on("video_offer", ({ to, from, offer, role }) => {
    io.to(to).emit("video_offer", { offer, from, role });
  });

  // WebRTC answer
  socket.on("video_answer", ({ to, from, answer, role }) => {
    io.to(to).emit("video_answer", { answer, from, role });
  });

  // ICE candidate
  socket.on("video_ice_candidate", ({ to, from, candidate, role }) => {
    io.to(to).emit("video_ice_candidate", { candidate, from, role });
  });

  // End call
  socket.on("video_call_end", ({ to, from, role }) => {
    io.to(to).emit("video_call_end", { from, role });
  });

  // Handle sending messages
  socket.on("send_message", async (message) => {
    const { patientId, doctorId, sender, content } = message;
    const room = `${patientId}-${doctorId}`;

    // Save to MongoDB
    const newMessage = new (require("./models/Message"))({
      patientId,
      doctorId,
      sender,
      content,
    });
    await newMessage.save();

    // Broadcast to room
    io.to(room).emit("receive_message", newMessage);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
    }
  });
});

// Routes - Define API routes BEFORE static file serving
app.use("/api", apiRoutes);

// Static file serving (for production)
app.use(express.static(path.join(__dirname, "../client/build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build/index.html"));
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// In server/server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// We will create these route files in the next steps
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
// const userRoutes = require('./routes/user'); // We'll add this later if needed
const { authenticateSocket } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});

// --- Middleware ---
// Helmet helps secure your app by setting various HTTP headers
app.use(helmet()); 
// CORS allows your frontend (on a different URL) to communicate with your backend
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3001",
  credentials: true
}));
// This allows Express to understand incoming JSON data
app.use(express.json({ limit: '10mb' }));

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// --- Database connection ---
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// --- Routes ---
// We'll wire up our API endpoints here
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
// app.use('/api/user', userRoutes);

// --- Socket.io connection handling ---
// First, authenticate the socket connection using our JWT middleware
io.use(authenticateSocket);

io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected`);

  // Join a private room for this user, so we can send messages only to them
  socket.join(`user_${socket.userId}`);

  // Listen for when the user disconnects
  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
  });
});

// Make `io` accessible in our controllers so we can emit events from there
app.set('io', io);

// --- Start the server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
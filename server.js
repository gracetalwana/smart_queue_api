/**
 * server.js – Application entry point
 *
 * This file:
 *  1. Creates the Express app + HTTP server + Socket.IO
 *  2. Attaches global middleware (JSON body parser, CORS)
 *  3. Mounts all route groups under /api
 *  4. Starts the HTTP server and cron jobs
 */


const http = require('http');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { Server } = require('socket.io');
const router = express.Router();

router.get('/notifications', (req, res) => { 
  res.send('Hello from notifications');
});

// Load environment variables from the .env file into process.env
dotenv.config();

// ─── Route imports ────────────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const slotRoutes = require('./routes/slotRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const counterRoutes = require('./routes/counterRoutes');

// ─── Create Express Application ──────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ─── Socket.IO Setup ─────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Expose io globally so services can emit events without circular imports
globalThis.io = io;

io.on('connection', (socket) => {
  // Clients join a slot room to receive live queue updates for that slot
  socket.on('join_slot', (slotId) => {
    socket.join(`slot_${slotId}`);
  });
  // Clients join their personal room to receive targeted notifications
  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
  });
  socket.on('disconnect', () => { });
});

// ─── Global Middleware ────────────────────────────────────────────────────────
app.use(express.json());
app.use(cors());

app.use('/api/reports', reportRoutes);

// ─── Health-Check Route ───────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ message: 'Smart Queue API is running 🚀', status: 'ok' });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/counters', counterRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

// ─── Start Server + Cron Jobs ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Smart Queue API running on port ${PORT}`);
  // Start scheduled jobs after the server is up
  require('./jobs/cronJobs');


});

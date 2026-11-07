const http = require('http');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const connectDB = require('./config/db');
const { initSocket } = require('./services/socketService');

// Route handlers
const authRoutes = require('./routes/authRoutes');
const roleRoutes = require('./routes/roleRoutes');
const userRoutes = require('./routes/userRoutes');
const salesmanRoutes = require('./routes/salesmanRoutes');
const partyRoutes = require('./routes/partyRoutes');
const routeRoutes = require('./routes/routeRoutes');
const visitRoutes = require('./routes/visitRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const trackingRoutes = require('./routes/trackingRoutes');

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Middleware
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health Check API
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    product: 'Salesman Field Suite API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/salesmen', salesmanRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/tracking', trackingRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[API Server Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5070;

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Salesman Field Suite Server running on port ${PORT}`);
  console.log(`📡 WebSocket Gateway ready for Uber/Ola Live Tracking`);
  console.log(`🔒 RBAC Permission Engine Active`);
  console.log(`=======================================================`);
});


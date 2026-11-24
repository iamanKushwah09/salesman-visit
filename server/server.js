const http = require('http');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const connectDB = require('./config/db');
// Real-time Fleet Presence & Socket Gateway
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

// Self-healing bootstrap to ensure Super Admin & Salesman roles exist on first boot
async function ensureInitialAdmin() {
  try {
    const Role = require('./models/Role');
    const User = require('./models/User');

    let adminRole = await Role.findOne({ slug: 'super_admin' });
    if (!adminRole) {
      adminRole = await Role.create({
        name: 'Super Admin',
        slug: 'super_admin',
        description: 'Master system administrator with full access',
        permissions: ['*'],
        isDefault: true,
        isActive: true,
      });
      console.log('[System Boot] Initialized Super Admin Role');
    }

    let salesmanRole = await Role.findOne({ slug: 'field_salesman' });
    if (!salesmanRole) {
      salesmanRole = await Role.create({
        name: 'Field Salesman',
        slug: 'field_salesman',
        description: 'Executes assigned field routes, customer visits, check-ins, and collections',
        permissions: ['dashboard', 'routes', 'visits', 'parties', 'collections'],
        isDefault: false,
        isActive: true,
      });
      console.log('[System Boot] Initialized Field Salesman Role');
    }

    const initialEmail = (process.env.INITIAL_ADMIN_EMAIL || 'admin@gmail.com').toLowerCase().trim();
    const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Admin@123456';
    const initialName = process.env.INITIAL_ADMIN_NAME || 'System Administrator';

    const adminUser = await User.findOne({ email: initialEmail });
    if (!adminUser) {
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        await User.create({
          name: initialName,
          email: initialEmail,
          password: initialPassword,
          phone: '+91 99999 11111',
          role: adminRole._id,
          roleName: adminRole.name,
          roleSlug: 'super_admin',
          isActive: true,
        });
        console.log(`[System Boot] Created Initial Admin: ${initialEmail}`);
      }
    }
  } catch (err) {
    console.warn('[System Boot Warning]:', err.message);
  }
}

// Connect to MongoDB
connectDB().then(() => {
  ensureInitialAdmin();
});

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Middleware
const clientUrls = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((u) => u.trim().replace(/\/+$/, '')).filter(Boolean)
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      // Allow explicit configured URLs
      if (clientUrls.includes(origin)) return callback(null, true);
      // Allow all Vercel previews & production domains, localhost, and tunnels
      if (
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('192.168.') ||
        origin.endsWith('.loca.lt')
      ) {
        return callback(null, true);
      }
      // Safe fallback for cloud deployments so CORS never breaks API routes
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health Check API (For uptime monitors like BetterStack, Render, Pingdom)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    product: 'Salesman Field Suite API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
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

// Serve Frontend in Production if client build is present
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  console.log(`[Static Serving] Serving production frontend from ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  // SPA Catch-All fallback for client-side routing
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global API 404 handler (for unmatched /api calls)
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[API Server Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Process-level exception handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]:', err);
});

const PORT = process.env.PORT || 5070;

// Listen when executed as standalone server
if (process.env.VERCEL !== '1') {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Salesman Field Suite Server running on port ${PORT}`);
    console.log(`📡 WebSocket Gateway ready for Uber/Ola Live Tracking`);
    console.log(`🔒 RBAC Permission Engine & Auto-Bootstrap Active`);
    console.log(`=======================================================`);
  });
}

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received. Closing HTTP server gracefully...');
  server.close(() => {
    console.log('[Server] HTTP server closed.');
    process.exit(0);
  });
});

module.exports = app;
module.exports.app = app;
module.exports.server = server;

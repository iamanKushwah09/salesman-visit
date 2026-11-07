const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const LocationCurrent = require('../models/LocationCurrent');
const LocationHistory = require('../models/LocationHistory');
const Salesman = require('../models/Salesman');

let ioInstance = null;

// Throttling cache for history writes
const locationThrottleCache = new Map();
const MIN_DISTANCE_METERS = 10;
const MIN_TIME_SECONDS = 15;

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const activeSalesmanSockets = new Map();

function isSalesmanConnected(salesmanId) {
  if (!salesmanId) return false;
  const set = activeSalesmanSockets.get(salesmanId.toString());
  return !!(set && set.size > 0);
}

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
    transports: ['websocket', 'polling'],
  });

  ioInstance = io;

  io.on('connection', (socket) => {
    // Admin joins tracking radar room
    socket.on('join:admin_tracking', () => {
      socket.join('admin:tracking');
      console.log(`[Socket] Client ${socket.id} joined admin:tracking room`);
    });

    // Salesman device announces presence
    socket.on('join:salesman', async (salesmanId) => {
      if (!salesmanId) return;
      const sid = salesmanId.toString();
      socket.join(`salesman:${sid}`);
      socket.salesmanId = sid;

      if (!activeSalesmanSockets.has(sid)) {
        activeSalesmanSockets.set(sid, new Set());
      }
      activeSalesmanSockets.get(sid).add(socket.id);

      const now = new Date();
      await LocationCurrent.findOneAndUpdate(
        { salesman: sid },
        { isOnline: true, trackingStatus: 'live', lastSeenAt: now }
      );

      io.to('admin:tracking').emit('admin:salesman:status', {
        salesmanId: sid,
        isOnline: true,
        trackingStatus: 'live',
        lastSeenAt: now,
      });
      console.log(`[Socket] Salesman ${sid} connected & marked LIVE`);
    });

    // Periodic Heartbeat
    socket.on('salesman:heartbeat', async (data = {}) => {
      const sid = socket.salesmanId || data.salesmanId;
      if (!sid) return;

      const now = new Date();
      const updateFields = { isOnline: true, trackingStatus: 'live', lastSeenAt: now };
      if (data.battery != null) updateFields.battery = data.battery;

      await LocationCurrent.findOneAndUpdate({ salesman: sid }, updateFields);

      io.to('admin:tracking').emit('admin:salesman:status', {
        salesmanId: sid,
        isOnline: true,
        trackingStatus: 'live',
        lastSeenAt: now,
        battery: data.battery,
      });
    });

    // High-frequency live location update from salesman device
    socket.on('salesman:location:update', async (data) => {
      try {
        const { salesmanId, latitude, longitude, speed = 0, heading = 0, accuracy = 0, battery = null, address = '' } = data;

        if (!salesmanId || latitude == null || longitude == null) return;

        const sid = salesmanId.toString();
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        if (isNaN(lat) || isNaN(lng)) return;

        const now = new Date();
        const sm = await Salesman.findById(sid).select('name');
        const salesmanName = sm ? sm.name : 'Salesman';

        // 1. Update current location
        await LocationCurrent.findOneAndUpdate(
          { salesman: sid },
          {
            salesman: sid,
            salesmanName,
            latitude: lat,
            longitude: lng,
            speed: Number(speed) || 0,
            heading: Number(heading) || 0,
            accuracy: Number(accuracy) || 0,
            battery: battery != null ? Number(battery) : null,
            address,
            trackingStatus: 'live',
            lastSeenAt: now,
            isOnline: true,
          },
          { upsert: true, new: true }
        );

        // 2. Broadcast to all active admin radar screens
        io.to('admin:tracking').emit('admin:location:update', {
          salesmanId: sid,
          salesmanName,
          latitude: lat,
          longitude: lng,
          speed: Number(speed) || 0,
          heading: Number(heading) || 0,
          accuracy: Number(accuracy) || 0,
          battery,
          address,
          trackingStatus: 'live',
          lastSeenAt: now,
        });

        // 3. Throttle write to LocationHistory (>=10m or >=15s)
        const last = locationThrottleCache.get(sid);
        let shouldWriteHistory = true;

        if (last) {
          const timeDiff = (now.getTime() - last.time) / 1000;
          const dist = getDistanceInMeters(last.lat, last.lng, lat, lng);
          if (timeDiff < MIN_TIME_SECONDS && dist < MIN_DISTANCE_METERS) {
            shouldWriteHistory = false;
          }
        }

        if (shouldWriteHistory) {
          locationThrottleCache.set(sid, { time: now.getTime(), lat, lng });
          await LocationHistory.create({
            salesman: sid,
            latitude: lat,
            longitude: lng,
            speed: Number(speed) || 0,
            heading: Number(heading) || 0,
            accuracy: Number(accuracy) || 0,
            battery,
            address,
            timestamp: now,
          });
        }
      } catch (err) {
        console.error('[Socket] location update error:', err.message);
      }
    });

    socket.on('disconnect', () => {
      if (socket.salesmanId) {
        const sid = socket.salesmanId;
        const set = activeSalesmanSockets.get(sid);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) activeSalesmanSockets.delete(sid);
        }

        setTimeout(async () => {
          if (!isSalesmanConnected(sid)) {
            await LocationCurrent.findOneAndUpdate({ salesman: sid }, { isOnline: false, trackingStatus: 'offline' });
            io.to('admin:tracking').emit('admin:salesman:status', {
              salesmanId: sid,
              isOnline: false,
              trackingStatus: 'offline',
              lastSeenAt: new Date(),
            });
          }
        }, 30000);
      }
    });
  });

  return io;
}

function getIO() {
  return ioInstance;
}

module.exports = { initSocket, getIO };


const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const LocationCurrent = require('../models/LocationCurrent');
const LocationHistory = require('../models/LocationHistory');
const Salesman = require('../models/Salesman');
const { reverseGeocode } = require('./geocodingService');

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
      const sm = await Salesman.findById(sid).select('name salesmanCode territory vehicleType');
      const salesmanName = sm ? sm.name : 'Salesman';

      // Ensure LocationCurrent is upserted so new salesmen are tracked
      await LocationCurrent.findOneAndUpdate(
        { salesman: sid },
        {
          salesman: sid,
          salesmanName,
          isOnline: true,
          trackingStatus: 'live',
          lastSeenAt: now,
        },
        { upsert: true, new: true }
      );

      io.to('admin:tracking').emit('admin:salesman:status', {
        salesmanId: sid,
        salesmanName,
        salesmanCode: sm?.salesmanCode,
        territory: sm?.territory,
        isOnline: true,
        trackingStatus: 'live',
        lastSeenAt: now,
      });

      console.log(`[Socket] Salesman ${sid} (${salesmanName}) connected & marked LIVE`);
    });

    // Periodic Heartbeat from active salesman device
    socket.on('salesman:heartbeat', async (data = {}) => {
      const sid = socket.salesmanId || data.salesmanId;
      if (!sid) return;

      const now = new Date();
      const updateFields = { isOnline: true, trackingStatus: 'live', lastSeenAt: now };
      if (data.battery != null) updateFields.battery = Number(data.battery);
      if (data.latitude != null && data.longitude != null) {
        updateFields.latitude = Number(data.latitude);
        updateFields.longitude = Number(data.longitude);
      }
      if (data.speed != null) updateFields.speed = Number(data.speed);
      if (data.heading != null) updateFields.heading = Number(data.heading);
      if (data.accuracy != null) updateFields.accuracy = Number(data.accuracy);
      if (data.address) updateFields.address = data.address;

      const sm = await Salesman.findById(sid).select('name salesmanCode territory');
      const salesmanName = sm ? sm.name : 'Salesman';
      updateFields.salesman = sid;
      updateFields.salesmanName = salesmanName;

      const updated = await LocationCurrent.findOneAndUpdate({ salesman: sid }, updateFields, {
        upsert: true,
        new: true,
      });

      io.to('admin:tracking').emit('admin:salesman:status', {
        salesmanId: sid,
        salesmanName,
        salesmanCode: sm?.salesmanCode,
        territory: sm?.territory,
        isOnline: true,
        trackingStatus: 'live',
        lastSeenAt: now,
        battery: updated?.battery,
        latitude: updated?.latitude,
        longitude: updated?.longitude,
        speed: updated?.speed,
        address: updated?.address,
      });
    });

    // High-frequency live location update from salesman device
    socket.on('salesman:location:update', async (data) => {
      try {
        const { salesmanId, latitude, longitude, speed = 0, heading = 0, accuracy = 0, battery = null, address = '' } = data;

        const sid = (salesmanId || socket.salesmanId)?.toString();
        if (!sid || latitude == null || longitude == null) return;

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        if (isNaN(lat) || isNaN(lng)) return;

        const now = new Date();
        const sm = await Salesman.findById(sid).select('name salesmanCode territory vehicleType');
        const salesmanName = sm ? sm.name : 'Salesman';

        let resolvedAddress = address;
        if (!resolvedAddress) {
          resolvedAddress = await reverseGeocode(lat, lng);
        }

        // 1. Update current location with upsert: true
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
            address: resolvedAddress,
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
          salesmanCode: sm?.salesmanCode,
          territory: sm?.territory,
          latitude: lat,
          longitude: lng,
          speed: Number(speed) || 0,
          heading: Number(heading) || 0,
          accuracy: Number(accuracy) || 0,
          battery,
          address: resolvedAddress,
          trackingStatus: 'live',
          lastSeenAt: now,
        });

        io.to('admin:tracking').emit('admin:salesman:status', {
          salesmanId: sid,
          salesmanName,
          salesmanCode: sm?.salesmanCode,
          territory: sm?.territory,
          isOnline: true,
          trackingStatus: 'live',
          lastSeenAt: now,
          battery,
          latitude: lat,
          longitude: lng,
          speed: Number(speed) || 0,
        });

        // 3. Throttled history save
        const cached = locationThrottleCache.get(sid);
        let shouldSaveHistory = false;

        if (!cached) {
          shouldSaveHistory = true;
        } else {
          const timeDiffSeconds = (now - cached.timestamp) / 1000;
          const distMeters = getDistanceInMeters(cached.latitude, cached.longitude, lat, lng);
          if (timeDiffSeconds >= MIN_TIME_SECONDS && distMeters >= MIN_DISTANCE_METERS) {
            shouldSaveHistory = true;
          }
        }

        if (shouldSaveHistory) {
          locationThrottleCache.set(sid, { latitude: lat, longitude: lng, timestamp: now });
          await LocationHistory.create({
            salesman: sid,
            salesmanName,
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
            await LocationCurrent.findOneAndUpdate(
              { salesman: sid },
              { isOnline: false, trackingStatus: 'offline' }
            );
            io.to('admin:tracking').emit('admin:salesman:status', {
              salesmanId: sid,
              isOnline: false,
              trackingStatus: 'offline',
              lastSeenAt: new Date(),
            });
            console.log(`[Socket] Salesman ${sid} disconnected & marked OFFLINE`);
          }
        }, 20000);
      }
    });
  });

  return io;
}

function getIO() {
  return ioInstance;
}

module.exports = { initSocket, getIO };

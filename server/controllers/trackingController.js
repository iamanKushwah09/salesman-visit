const LocationCurrent = require('../models/LocationCurrent');
const LocationHistory = require('../models/LocationHistory');
const Salesman = require('../models/Salesman');
const Visit = require('../models/Visit');
const Collection = require('../models/Collection');

// Compute tracking status
function computeStatus(lastSeenAt, isOnline) {
  if (!lastSeenAt || !isOnline) return 'offline';
  const ageSeconds = (Date.now() - new Date(lastSeenAt).getTime()) / 1000;
  if (ageSeconds <= 300) return 'live'; // 5 minutes window
  if (ageSeconds <= 1800) return 'stale'; // 30 minutes window
  return 'offline';
}

// GET /api/tracking/live-locations
exports.getLiveLocations = async (req, res) => {
  try {
    const isStaffAdmin =
      req.user?.roleSlug === 'super_admin' ||
      req.user?.role?.slug === 'super_admin' ||
      req.user?.roleSlug === 'area_sales_manager' ||
      req.user?.role?.slug === 'area_sales_manager' ||
      req.user?.role?.permissions?.includes('*');

    const isSalesman = !isStaffAdmin && !!req.user?.salesmanProfile;
    const salesmanQuery = { isActive: true };
    if (isSalesman) {
      salesmanQuery._id = req.user.salesmanProfile._id || req.user.salesmanProfile;
    }

    const salesmen = await Salesman.find(salesmanQuery);
    const locations = await LocationCurrent.find();

    const locationMap = new Map();
    locations.forEach((l) => locationMap.set(l.salesman.toString(), l));

    // Get today's visits and collections for each salesman
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [todayVisits, todayCollections] = await Promise.all([
      Visit.find({ visitDate: { $gte: startOfDay } }),
      Collection.find({ date: { $gte: startOfDay } }),
    ]);

    const visitCountMap = new Map();
    const latestVisitGpsMap = new Map();

    todayVisits.forEach((v) => {
      const sid = v.salesman.toString();
      visitCountMap.set(sid, (visitCountMap.get(sid) || 0) + 1);

      if (v.checkIn?.latitude && v.checkIn?.longitude) {
        const existing = latestVisitGpsMap.get(sid);
        if (!existing || new Date(v.checkIn.timestamp || v.updatedAt) > new Date(existing.timestamp)) {
          latestVisitGpsMap.set(sid, {
            latitude: v.checkIn.latitude,
            longitude: v.checkIn.longitude,
            address: v.checkIn.address || v.partyName || '',
            accuracy: v.checkIn.accuracy || null,
            timestamp: v.checkIn.timestamp || v.updatedAt,
          });
        }
      }
    });

    const collectionMapSum = new Map();
    todayCollections.forEach((c) => {
      const sid = c.salesman.toString();
      collectionMapSum.set(sid, (collectionMapSum.get(sid) || 0) + (c.amount || 0));
    });

    const result = salesmen.map((sm) => {
      const sid = sm._id.toString();
      const loc = locationMap.get(sid);
      const visitGps = latestVisitGpsMap.get(sid);

      const status = loc ? computeStatus(loc.lastSeenAt, loc.isOnline) : 'offline';
      const effectiveLat = loc?.latitude ?? visitGps?.latitude ?? null;
      const effectiveLng = loc?.longitude ?? visitGps?.longitude ?? null;
      const effectiveAddress = loc?.address || visitGps?.address || '';

      return {
        salesmanId: sm._id,
        salesmanCode: sm.salesmanCode,
        name: sm.name,
        phone: sm.phone,
        territory: sm.territory,
        vehicleType: sm.vehicleType,
        latitude: effectiveLat != null ? Number(effectiveLat) : null,
        longitude: effectiveLng != null ? Number(effectiveLng) : null,
        speed: loc?.speed ?? 0,
        heading: loc?.heading ?? 0,
        accuracy: loc?.accuracy ?? visitGps?.accuracy ?? null,
        battery: loc?.battery ?? null,
        address: effectiveAddress,
        trackingStatus: status,
        isOnline: status !== 'offline',
        lastSeenAt: loc?.lastSeenAt ?? visitGps?.timestamp ?? null,
        visitsToday: visitCountMap.get(sid) || 0,
        collectionToday: collectionMapSum.get(sid) || 0,
      };
    });

    res.status(200).json({ success: true, locations: result });
  } catch (err) {
    console.error('getLiveLocations error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch live locations' });
  }
};

// GET /api/tracking/history/:salesmanId
exports.getLocationHistory = async (req, res) => {
  try {
    const { salesmanId } = req.params;
    const { date } = req.query;

    const query = { salesman: salesmanId };
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.timestamp = { $gte: start, $lte: end };
    } else {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      query.timestamp = { $gte: start };
    }

    const history = await LocationHistory.find(query).sort({ timestamp: 1 });
    res.status(200).json({ success: true, history });
  } catch (err) {
    console.error('getLocationHistory error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch location history' });
  }
};

// POST /api/tracking/update-location
exports.updateLocationRest = async (req, res) => {
  try {
    const { salesmanId, latitude, longitude, speed = 0, heading = 0, accuracy = 0, battery = null, address = '' } = req.body;

    if (!salesmanId || latitude == null || longitude == null) {
      return res.status(400).json({ success: false, message: 'SalesmanId, latitude, and longitude are required' });
    }

    const sm = await Salesman.findById(salesmanId);
    if (!sm) {
      return res.status(400).json({ success: false, message: 'Salesman not found' });
    }

    const now = new Date();

    await LocationCurrent.findOneAndUpdate(
      { salesman: sm._id },
      {
        salesman: sm._id,
        salesmanName: sm.name,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
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

    await LocationHistory.create({
      salesman: sm._id,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      speed: Number(speed) || 0,
      heading: Number(heading) || 0,
      accuracy: Number(accuracy) || 0,
      battery: battery != null ? Number(battery) : null,
      address,
      timestamp: now,
    });

    res.status(200).json({ success: true, message: 'Location recorded' });
  } catch (err) {
    console.error('updateLocationRest error:', err);
    res.status(500).json({ success: false, message: 'Failed to update location' });
  }
};


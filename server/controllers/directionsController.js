const axios = require('axios');

const directionsCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

// Helper: Haversine distance in meters
function calculateHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/tracking/directions
exports.getDirections = async (req, res) => {
  try {
    const { points, origin, destination } = req.query;

    let coords = [];
    if (points) {
      coords = points
        .split(';')
        .map((p) => p.split(',').map((n) => parseFloat(n.trim())))
        .filter((p) => p.length === 2 && !isNaN(p[0]) && !isNaN(p[1]));
    } else if (origin && destination) {
      const orig = origin.split(',').map((n) => parseFloat(n.trim()));
      const dest = destination.split(',').map((n) => parseFloat(n.trim()));
      if (orig.length === 2 && dest.length === 2 && !isNaN(orig[0]) && !isNaN(dest[0])) {
        coords = [orig, dest];
      }
    }

    if (coords.length < 2) {
      return res.status(400).json({ success: false, message: 'At least 2 coordinate pairs required' });
    }

    const cacheKey = coords.map((c) => `${c[0].toFixed(5)},${c[1].toFixed(5)}`).join(';');
    const cached = directionsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json({ success: true, ...cached.data, cached: true });
    }

    // Try OSRM Driving Engine (Lng, Lat order)
    try {
      const osrmCoordStr = coords.map((c) => `${c[1]},${c[0]}`).join(';');
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${osrmCoordStr}?overview=full&geometries=geojson&steps=true`;

      const osrmRes = await axios.get(osrmUrl, { timeout: 6000 });
      if (osrmRes.data && osrmRes.data.code === 'Ok' && osrmRes.data.routes?.length > 0) {
        const route = osrmRes.data.routes[0];
        const polyline = route.geometry.coordinates.map((c) => [c[1], c[0]]);

        const result = {
          polyline,
          distanceKm: Number((route.distance / 1000).toFixed(1)),
          durationMins: Math.ceil(route.duration / 60),
          provider: 'osrm',
          legs: (route.legs || []).map((leg) => ({
            distance: `${(leg.distance / 1000).toFixed(1)} km`,
            duration: `${Math.ceil(leg.duration / 60)} mins`,
            summary: leg.summary || '',
          })),
        };

        directionsCache.set(cacheKey, { timestamp: Date.now(), data: result });
        return res.json({ success: true, ...result });
      }
    } catch (osrmErr) {
      console.warn('[Directions] OSRM routing request failed:', osrmErr.message);
    }

    // Direct fallback
    let totalMeters = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      totalMeters += calculateHaversine(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
    }
    const distKm = Number((totalMeters / 1000).toFixed(1));
    const estMins = Math.ceil((distKm / 30) * 60);

    const fallbackResult = {
      polyline: coords,
      distanceKm: distKm,
      durationMins: estMins,
      provider: 'direct_fallback',
      legs: [],
    };

    return res.json({ success: true, ...fallbackResult });
  } catch (err) {
    console.error('getDirections error:', err);
    res.status(500).json({ success: false, message: 'Failed to compute directions' });
  }
};


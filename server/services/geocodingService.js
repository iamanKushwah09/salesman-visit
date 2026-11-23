const axios = require('axios');

const geocodeCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours cache

/**
 * Reverse geocodes coordinates to a human-readable address.
 * Caches coordinates rounded to ~100 meters.
 */
async function reverseGeocode(latitude, longitude) {
  if (latitude == null || longitude == null) return '';

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return '';

  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.address;
  }

  try {
    const res = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      {
        headers: {
          'User-Agent': 'SalesmanFieldOperationsSuite/1.0 (internal-fleet)',
          'Accept-Language': 'en',
        },
        timeout: 3500,
      }
    );

    if (res.data && res.data.display_name) {
      // Pick a concise version: road, suburb, city, state
      const addr = res.data.address || {};
      const parts = [
        addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood,
        addr.city || addr.town || addr.village || addr.county,
        addr.state,
      ].filter(Boolean);

      const readableAddress = parts.length > 0 ? parts.join(', ') : res.data.display_name;
      geocodeCache.set(cacheKey, { address: readableAddress, timestamp: Date.now() });
      return readableAddress;
    }
  } catch (err) {
    // Network or timeout: return clean coordinate string without breaking
  }

  const fallback = `GPS [${lat.toFixed(4)}, ${lng.toFixed(4)}]`;
  geocodeCache.set(cacheKey, { address: fallback, timestamp: Date.now() });
  return fallback;
}

module.exports = { reverseGeocode };


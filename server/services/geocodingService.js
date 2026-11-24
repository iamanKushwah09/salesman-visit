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

  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;

  // 1. Try Google Maps Reverse Geocoding API if key provided
  if (googleApiKey && googleApiKey.trim()) {
    try {
      const googleRes = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleApiKey.trim()}`,
        { timeout: 4000 }
      );
      if (googleRes.data && googleRes.data.status === 'OK' && googleRes.data.results?.length > 0) {
        const top = googleRes.data.results[0];
        const readableAddress = top.formatted_address;
        geocodeCache.set(cacheKey, { address: readableAddress, timestamp: Date.now() });
        return readableAddress;
      }
    } catch (gErr) {
      // Fall through to OpenStreetMap Nominatim
    }
  }

  // 2. OpenStreetMap Nominatim fallback
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

/**
 * Forward geocodes an address string to { latitude, longitude, formattedAddress, provider }.
 * Uses Google Maps Geocoding API if GOOGLE_MAPS_API_KEY is available and active,
 * otherwise falls back cleanly to OpenStreetMap Nominatim.
 */
async function forwardGeocode(addressString) {
  if (!addressString || !addressString.trim()) {
    throw new Error('Address string is required for geocoding');
  }

  const query = addressString.trim();
  const cacheKey = `fwd_${query.toLowerCase()}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;

  // 1. Try Google Maps Geocoding API if key provided
  if (googleApiKey && googleApiKey.trim()) {
    try {
      const googleRes = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${googleApiKey.trim()}`,
        { timeout: 5000 }
      );

      if (googleRes.data && googleRes.data.status === 'OK' && googleRes.data.results?.length > 0) {
        const top = googleRes.data.results[0];
        const data = {
          latitude: Number(top.geometry.location.lat.toFixed(6)),
          longitude: Number(top.geometry.location.lng.toFixed(6)),
          formattedAddress: top.formatted_address,
          provider: 'google',
        };
        geocodeCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      } else if (googleRes.data && googleRes.data.status !== 'OK') {
        console.warn(`[Google Geocode Notice]: Status ${googleRes.data.status} - ${googleRes.data.error_message || ''}. Falling back to OpenStreetMap.`);
      }
    } catch (gErr) {
      console.warn('[Google Geocode Error]:', gErr.message, '. Falling back to OpenStreetMap.');
    }
  }

  // 2. OpenStreetMap Nominatim fallback (100% Free & Accurate)
  try {
    const searchOsm = async (q) => {
      try {
        const osmRes = await axios.get(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
          {
            headers: {
              'User-Agent': 'SalesmanFieldOperationsSuite/1.0 (internal-fleet)',
              'Accept-Language': 'en',
            },
            timeout: 5000,
          }
        );
        return osmRes.data && osmRes.data.length > 0 ? osmRes.data[0] : null;
      } catch (e) {
        return null;
      }
    };

    // Try full query first
    let top = await searchOsm(query);

    // If full query fails, try progressive sub-parts (e.g. "Fatehabad, Agra")
    if (!top) {
      const words = query.split(/[\s,]+/).filter(Boolean);
      for (let i = 1; i < words.length; i++) {
        const sub = words.slice(i).join(' ');
        if (sub.length < 3) continue;
        top = await searchOsm(sub);
        if (top) break;
      }
    }

    if (top) {
      const data = {
        latitude: Number(parseFloat(top.lat).toFixed(6)),
        longitude: Number(parseFloat(top.lon).toFixed(6)),
        formattedAddress: top.display_name,
        provider: 'osm',
      };
      geocodeCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    }
  } catch (osmErr) {
    console.warn('[OSM Geocode Error]:', osmErr.message);
  }

  throw new Error(`Unable to find GPS coordinates for: "${query}". Please verify address or enter coordinates manually.`);
}

module.exports = { reverseGeocode, forwardGeocode };


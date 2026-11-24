import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext(null);

function calculateHaversineM(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateBearingDeg(startLat, startLng, destLat, destLng) {
  if (!startLat || !destLat || (startLat === destLat && startLng === destLng)) return 0;
  const p1 = (startLat * Math.PI) / 180;
  const p2 = (destLat * Math.PI) / 180;
  const dLng = ((destLng - startLng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.cos(p1) * Math.cos(dLng);
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
}

export const SocketProvider = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const activeSocketRef = useRef(null);

  useEffect(() => {
    if (!token) {
      if (activeSocketRef.current) {
        activeSocketRef.current.disconnect();
        activeSocketRef.current = null;
        setSocket(null);
      }
      return;
    }

    const getSocketUrl = () => {
      const envSocketUrl = import.meta.env.VITE_SOCKET_URL;
      const envServerUrl = import.meta.env.VITE_SERVER_URL;

      if (envSocketUrl && envSocketUrl.trim()) {
        return envSocketUrl.trim().replace(/\/+$/, '');
      }

      if (envServerUrl && envServerUrl.trim()) {
        return envServerUrl
          .trim()
          .replace(/\/+$/, '')
          .replace(/\/api$/, '');
      }

      // Default: connect to window origin (Vite proxies /socket.io with ws: true to backend :5070)
      if (typeof window !== 'undefined' && window.location.origin) {
        return window.location.origin;
      }

      return 'http://localhost:5070';
    };

    const socketUrl = getSocketUrl();
    const socketInstance = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
    });

    activeSocketRef.current = socketInstance;
    setSocket(socketInstance);

    const salesmanId =
      user?.salesmanProfile?._id ||
      (typeof user?.salesmanProfile === 'string' ? user.salesmanProfile : null);

    let heartbeatInterval = null;
    let gpsPollInterval = null;
    let watchId = null;
    let lastPosition = null; // { lat, lng, time, heading }
    let cachedBattery = null;

    // Detect device battery on phone
    if (typeof navigator !== 'undefined' && navigator.getBattery) {
      navigator
        .getBattery()
        .then((bat) => {
          cachedBattery = Math.round(bat.level * 100);
          bat.addEventListener('levelchange', () => {
            cachedBattery = Math.round(bat.level * 100);
          });
        })
        .catch(() => {});
    }

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected to Live Gateway:', socketInstance.id);
      socketInstance.emit('join:admin_tracking');

      if (salesmanId) {
        socketInstance.emit('join:salesman', salesmanId);
        socketInstance.emit('salesman:heartbeat', { salesmanId, battery: cachedBattery });
      }
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('[Socket Connection Warning]:', err.message);
    });

    // 📱 HARDWARE GPS TRACKER FOR FIELD SALESMAN (MOBILE PHONE OPTIMIZED)
    if (salesmanId) {
      // 1. Regular heartbeat every 15s
      heartbeatInterval = setInterval(() => {
        if (socketInstance.connected) {
          socketInstance.emit('salesman:heartbeat', {
            salesmanId,
            battery: cachedBattery,
          });
        }
      }, 15000);

      // 2. High-accuracy real-time position handler
      const handleLocationUpdate = (pos) => {
        if (!socketInstance.connected || !pos?.coords) return;
        const { latitude, longitude, accuracy, speed, heading } = pos.coords;
        const now = Date.now();

        let finalSpeed = 0;
        let finalHeading = 0;

        if (lastPosition) {
          const distMeters = calculateHaversineM(
            lastPosition.lat,
            lastPosition.lng,
            latitude,
            longitude
          );
          const timeSec = Math.max(0.2, (now - lastPosition.time) / 1000);

          // If phone reports hardware speed in m/s, convert to km/h
          if (speed != null && !isNaN(speed) && speed > 0.4) {
            finalSpeed = Math.round(speed * 3.6);
          } else if (distMeters >= 3 && timeSec > 0.4) {
            // Calculated speed from displacement over time: (m / s) * 3.6 = km/h
            const computed = (distMeters / timeSec) * 3.6;
            // Filter jitter
            if (computed < 160) {
              finalSpeed = Math.round(computed);
            }
          }

          // Calculate heading if phone sensor didn't report it
          if (heading != null && !isNaN(heading) && heading >= 0) {
            finalHeading = Math.round(heading);
          } else if (distMeters >= 3) {
            finalHeading = calculateBearingDeg(
              lastPosition.lat,
              lastPosition.lng,
              latitude,
              longitude
            );
          } else {
            finalHeading = lastPosition.heading || 0;
          }
        }

        lastPosition = {
          lat: latitude,
          lng: longitude,
          time: now,
          heading: finalHeading,
        };

        socketInstance.emit('salesman:location:update', {
          salesmanId,
          latitude,
          longitude,
          speed: finalSpeed,
          heading: finalHeading,
          accuracy: Math.round(accuracy || 0),
          battery: cachedBattery,
        });
      };

      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        // Immediate GPS capture
        navigator.geolocation.getCurrentPosition(
          handleLocationUpdate,
          (err) => console.log('[Geolocation initial]:', err.message),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );

        // Continuous watcher (maximumAge: 0 for instant live updates on phone)
        try {
          watchId = navigator.geolocation.watchPosition(
            handleLocationUpdate,
            (err) => console.log('[Geolocation watch]:', err.message),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
          );
        } catch (e) {
          console.warn('[Geolocation watchPosition exception]:', e);
        }

        // Active poll every 4s to prevent mobile browser throttling
        gpsPollInterval = setInterval(() => {
          if (socketInstance.connected && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              handleLocationUpdate,
              () => {},
              { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
          }
        }, 4000);
      }
    }

    // Clean exit on window close or tab exit
    const handleUnload = () => {
      if (socketInstance.connected && salesmanId) {
        socketInstance.emit('salesman:offline', { salesmanId });
        socketInstance.disconnect();
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (gpsPollInterval) clearInterval(gpsPollInterval);
      if (watchId != null && typeof window !== 'undefined' && navigator.geolocation?.clearWatch) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (socketInstance) {
        if (socketInstance.connected && salesmanId) {
          socketInstance.emit('salesman:offline', { salesmanId });
        }
        socketInstance.disconnect();
      }
      activeSocketRef.current = null;
      setSocket(null);
    };
  }, [token, user]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};

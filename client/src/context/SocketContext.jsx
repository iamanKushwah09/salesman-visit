import React, { createContext, useContext, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    const getSocketUrl = () => {
      const envSocketUrl = import.meta.env.VITE_SOCKET_URL;
      const envServerUrl = import.meta.env.VITE_SERVER_URL;

      // 1. Explicit socket URL provided
      if (envSocketUrl && envSocketUrl.trim()) {
        return envSocketUrl.trim().replace(/\/+$/, '');
      }

      // 2. Server domain provided
      if (envServerUrl && envServerUrl.trim()) {
        return envServerUrl
          .trim()
          .replace(/\/+$/, '')
          .replace(/\/api$/, '');
      }

      // 3. Cloud / Production fallback: if running on a live domain, connect to current origin
      if (
        typeof window !== 'undefined' &&
        window.location.origin &&
        !window.location.origin.includes('localhost') &&
        !window.location.origin.includes('127.0.0.1')
      ) {
        return window.location.origin;
      }

      // 4. Default local development server
      return 'http://localhost:5070';
    };

    const socketUrl = getSocketUrl();
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
    });

    socketRef.current = socket;

    // Extract salesman profile ID safely
    const salesmanId =
      user?.salesmanProfile?._id ||
      (typeof user?.salesmanProfile === 'string' ? user.salesmanProfile : null);

    let heartbeatInterval = null;
    let watchId = null;

    socket.on('connect', () => {
      console.log('[Socket] Connected to Live Gateway:', socket.id);
      socket.emit('join:admin_tracking');

      if (salesmanId) {
        socket.emit('join:salesman', salesmanId);
        // Immediate initial presence heartbeat
        socket.emit('salesman:heartbeat', { salesmanId });
      }
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket Connection Warning]:', err.message);
    });

    // If logged in as Salesman: start live presence heartbeat and background GPS tracking
    if (salesmanId) {
      // 1. Periodic presence heartbeat every 15s to keep salesman marked LIVE
      heartbeatInterval = setInterval(() => {
        if (socket.connected) {
          socket.emit('salesman:heartbeat', { salesmanId });
        }
      }, 15000);

      // 2. Browser Geolocation watch
      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        const handleLocationUpdate = (pos) => {
          if (!socket.connected) return;
          const { latitude, longitude, speed, heading, accuracy } = pos.coords;
          socket.emit('salesman:location:update', {
            salesmanId,
            latitude,
            longitude,
            speed: speed ? Math.round(speed * 3.6) : 0, // km/h
            heading: heading || 0,
            accuracy: Math.round(accuracy || 0),
          });
        };

        // Immediate position fetch
        navigator.geolocation.getCurrentPosition(
          handleLocationUpdate,
          (err) => console.log('[Geolocation initial]:', err.message),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
        );

        // Continuous watcher
        try {
          watchId = navigator.geolocation.watchPosition(
            handleLocationUpdate,
            (err) => console.log('[Geolocation watch]:', err.message),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
          );
        } catch (e) {
          console.warn('[Geolocation watchPosition exception]:', e);
        }
      }
    }

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (watchId != null && typeof window !== 'undefined' && navigator.geolocation?.clearWatch) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (socket) {
        socket.disconnect();
      }
    };
  }, [token, user]);

  return <SocketContext.Provider value={socketRef.current}>{children}</SocketContext.Provider>;
};

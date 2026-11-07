import React, { createContext, useContext, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5070';
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected to Live Gateway:', socket.id);
      socket.emit('join:admin_tracking');

      if (user?.salesmanProfile?._id) {
        socket.emit('join:salesman', user.salesmanProfile._id);
      }
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [token, user]);

  return <SocketContext.Provider value={socketRef.current}>{children}</SocketContext.Provider>;
};


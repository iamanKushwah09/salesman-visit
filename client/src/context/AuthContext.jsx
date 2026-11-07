import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('salesman_visit_user') || localStorage.getItem('fieldpulse_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('salesman_visit_token') || localStorage.getItem('fieldpulse_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.get('/auth/me')
        .then((res) => {
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem('salesman_visit_user', JSON.stringify(res.user));
          }
        })
        .catch(() => {
          setUser(null);
          setToken(null);
          localStorage.removeItem('salesman_visit_user');
          localStorage.removeItem('salesman_visit_token');
          localStorage.removeItem('fieldpulse_user');
          localStorage.removeItem('fieldpulse_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.token) {
      localStorage.setItem('salesman_visit_token', res.token);
      localStorage.setItem('salesman_visit_user', JSON.stringify(res.user));
      localStorage.setItem('fieldpulse_token', res.token);
      localStorage.setItem('fieldpulse_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error(res.message || 'Login failed');
  };

  const logout = () => {
    localStorage.removeItem('salesman_visit_token');
    localStorage.removeItem('salesman_visit_user');
    localStorage.removeItem('fieldpulse_token');
    localStorage.removeItem('fieldpulse_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  // Check if current user has permission for a specific module
  const hasPermission = (permissionKey) => {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    const perms = Array.isArray(user.permissions) ? user.permissions : [];
    if (perms.includes('*') || perms.includes('all')) return true;
    return perms.includes(permissionKey);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        hasPermission,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};


import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LiveFleetRadar from './pages/LiveFleetRadar';
import RoutesManagement from './pages/RoutesManagement';
import VisitsManagement from './pages/VisitsManagement';
import PartiesManagement from './pages/PartiesManagement';
import CollectionsManagement from './pages/CollectionsManagement';
import SalesmanManagement from './pages/SalesmanManagement';
import UserManagement from './pages/UserManagement';
import RoleManagement from './pages/RoleManagement';

const AppLayout = ({ children }) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      {children}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requiredPermission="dashboard">
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/live-radar"
              element={
                <ProtectedRoute requiredPermission="live_tracking">
                  <AppLayout>
                    <LiveFleetRadar />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/routes"
              element={
                <ProtectedRoute requiredPermission="routes">
                  <AppLayout>
                    <RoutesManagement />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/visits"
              element={
                <ProtectedRoute requiredPermission="visits">
                  <AppLayout>
                    <VisitsManagement />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/parties"
              element={
                <ProtectedRoute requiredPermission="parties">
                  <AppLayout>
                    <PartiesManagement />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/collections"
              element={
                <ProtectedRoute requiredPermission="collections">
                  <AppLayout>
                    <CollectionsManagement />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/salesmen"
              element={
                <ProtectedRoute requiredPermission="salesmen">
                  <AppLayout>
                    <SalesmanManagement />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/users"
              element={
                <ProtectedRoute requiredPermission="users">
                  <AppLayout>
                    <UserManagement />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/roles"
              element={
                <ProtectedRoute requiredPermission="roles">
                  <AppLayout>
                    <RoleManagement />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;


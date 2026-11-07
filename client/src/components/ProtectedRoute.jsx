import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

const ProtectedRoute = ({ children, requiredPermission }) => {
  const { user, loading, isAuthenticated, hasPermission } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-brand-600 font-semibold text-sm">
          <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
          Authenticating Salesman Visit...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-800">Permission Restricted</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your assigned role (<span className="font-semibold text-brand-600">{user?.role}</span>) does not have access to the{' '}
            <span className="font-semibold text-slate-700">'{requiredPermission}'</span> module. Please contact your system administrator.
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;


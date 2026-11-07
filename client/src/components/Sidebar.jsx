import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Navigation,
  MapPinned,
  CheckCircle2,
  Building2,
  Receipt,
  UserCheck,
  Users,
  ShieldCheck,
  LogOut,
  Radio,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, permission: 'dashboard' },
  { name: 'Live Tracking', path: '/live-radar', icon: Navigation, permission: 'live_tracking' },
  { name: 'Routes', path: '/routes', icon: MapPinned, permission: 'routes' },
  { name: 'Visits', path: '/visits', icon: CheckCircle2, permission: 'visits' },
  { name: 'Parties & Customers', path: '/parties', icon: Building2, permission: 'parties' },
  { name: 'Collections', path: '/collections', icon: Receipt, permission: 'collections' },
  { name: 'Salesmen', path: '/salesmen', icon: UserCheck, permission: 'salesmen' },
  { name: 'Users', path: '/users', icon: Users, permission: 'users' },
  { name: 'Roles & Permissions', path: '/roles', icon: ShieldCheck, permission: 'roles' },
];

const Sidebar = () => {
  const { user, logout, hasPermission } = useContext(AuthContext);

  // Dynamic filter: only show menu items that the logged-in role has permission for!
  const visibleItems = NAV_ITEMS.filter((item) => hasPermission(item.permission));

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen shrink-0 border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-md">
            <MapPinned className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-white block">Salesman Visit</span>
            <span className="text-[10px] text-brand-400 font-bold uppercase tracking-wider block -mt-1">
              Field Management
            </span>
          </div>
        </div>
      </div>

      {/* Role Pill Banner */}
      <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium">Role Name:</span>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
            {user?.roleName || user?.role || 'User'}
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {visibleItems.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No menus configured for this role.
          </div>
        ) : (
          visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[9.5px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded-md">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })
        )}
      </nav>

      {/* User Footer Profile & Logout */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-brand-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;


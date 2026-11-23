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
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, permission: 'dashboard' },
  { name: 'Customer Visits', path: '/visits', icon: CheckCircle2, permission: 'visits' },
  { name: 'Routes', path: '/routes', icon: MapPinned, permission: 'routes' },
  { name: 'Parties & Customers', path: '/parties', icon: Building2, permission: 'parties' },
  { name: 'Collections', path: '/collections', icon: Receipt, permission: 'collections' },
  { name: 'Live Tracking Radar', path: '/live-radar', icon: Navigation, permission: 'live_tracking' },
  { name: 'Salesmen Fleet', path: '/salesmen', icon: UserCheck, permission: 'salesmen' },
  { name: 'Users & Roles', path: '/users', icon: Users, permission: 'users' },
  { name: 'Permissions', path: '/roles', icon: ShieldCheck, permission: 'roles' },
];

const Sidebar = () => {
  const { user, logout, hasPermission } = useContext(AuthContext);
  const { isCollapsed, toggleSidebar, mobileOpen, closeMobileSidebar } = useSidebar();

  // Dynamic filter based on role permissions
  const visibleItems = NAV_ITEMS.filter((item) => hasPermission(item.permission));

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={closeMobileSidebar}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Floating edge tab button when sidebar is collapsed on desktop */}
      {isCollapsed && (
        <button
          onClick={toggleSidebar}
          type="button"
          aria-label="Expand sidebar"
          title="Expand sidebar (Full Navigation - Ctrl+B)"
          className="hidden md:flex fixed left-0 top-20 z-40 bg-white/95 backdrop-blur-xs border border-l-0 border-slate-200/90 shadow-md hover:shadow-lg pl-2 pr-2.5 py-2 rounded-r-xl text-slate-600 hover:text-brand-600 hover:bg-brand-50 transition-all cursor-pointer items-center justify-center group active:scale-95"
        >
          <ChevronRight className="w-4 h-4 text-brand-600 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Sidebar Container */}
      <div className="relative shrink-0 flex">
        <aside
          className={`fixed inset-y-0 left-0 z-50 md:static md:z-0 h-screen bg-white text-slate-800 flex flex-col shrink-0 border-r border-slate-200/90 shadow-xs transition-all duration-300 ease-in-out overflow-hidden ${
            mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
          } ${
            isCollapsed
              ? 'md:w-0 md:opacity-0 md:border-r-0 pointer-events-none md:pointer-events-none'
              : 'md:w-64 md:opacity-100'
          }`}
        >
          {/* Inner fixed-width container prevents content wrap during animation */}
          <div className="w-64 h-full flex flex-col shrink-0">
            {/* Brand Header */}
            <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2.5 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/20 shrink-0">
                  <MapPinned className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="font-extrabold text-base tracking-tight text-slate-900 block truncate">
                    Salesman Visit
                  </span>
                  <span className="text-[10px] text-brand-600 font-bold uppercase tracking-wider block -mt-1 truncate">
                    Field Operations
                  </span>
                </div>
              </div>

              {/* In/Out Collapse Button */}
              <button
                onClick={toggleSidebar}
                type="button"
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5 block md:hidden" />
                <ChevronLeft className="w-5 h-5 hidden md:block" />
              </button>
            </div>

          {/* Role Pill Banner */}
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">Session Role:</span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200/80 truncate max-w-[160px]">
                {user?.roleName || user?.role || 'User'}
              </span>
            </div>
          </div>

          {/* Navigation Items List */}
          <nav className="flex-1 px-3 py-3.5 space-y-1 overflow-y-auto">
            {visibleItems.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No menus configured for this role.
              </div>
            ) : (
              visibleItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={closeMobileSidebar}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                        isActive
                          ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30 font-bold'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.name}</span>
                    </div>
                  </NavLink>
                );
              })
            )}
          </nav>

          {/* User Footer Profile & Logout */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/60 shrink-0">
            <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{user?.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Desktop Side Border Toggle Button - Exactly where user red arrow pointed! */}
      {!isCollapsed && (
        <button
          onClick={toggleSidebar}
          type="button"
          aria-label="Collapse sidebar"
          title="Collapse sidebar to full screen view (Ctrl+B)"
          className="hidden md:flex absolute -right-3.5 top-20 z-30 w-7 h-7 bg-white border border-slate-200/90 rounded-full shadow-md items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-400 hover:shadow-lg transition-all hover:scale-110 cursor-pointer active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
    </div>
  </>
);
};

export default Sidebar;

import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import { useSidebar } from '../context/SidebarContext';
import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const Navbar = ({ title, subtitle }) => {
  const { user } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [socketOnline, setSocketOnline] = useState(false);

  useEffect(() => {
    if (!socket) return;
    setSocketOnline(Boolean(socket.connected));

    const onConnect = () => setSocketOnline(true);
    const onDisconnect = () => setSocketOnline(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket]);

  const isSalesman = !!user?.salesmanProfile && !user?.isSuperAdmin && user?.roleSlug !== 'super_admin';

  return (
    <header className="h-16 px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
      {/* Left: Sidebar Toggle + Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggleSidebar}
          type="button"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand Sidebar (Full Navigation)' : 'Collapse Sidebar (Full Width View)'}
          className="p-2 -ml-1 rounded-xl text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-slate-700/80 shadow-xs active:scale-95 cursor-pointer"
        >
          {/* Mobile hamburger icon */}
          <Menu className="w-5 h-5 block md:hidden" />

          {/* Desktop in-out collapse icons */}
          {isCollapsed ? (
            <PanelLeftOpen className="w-5 h-5 hidden md:block text-brand-600 dark:text-brand-400" />
          ) : (
            <PanelLeftClose className="w-5 h-5 hidden md:block text-slate-500 hover:text-slate-700 dark:text-slate-400" />
          )}
        </button>

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: Status and User Info */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Real-time Presence Badge */}
        {isSalesman ? (
          socketOnline ? (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live Online</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Connecting / Offline</span>
            </div>
          )
        ) : (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            <span className={`w-2 h-2 rounded-full ${socketOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span>{socketOnline ? 'Fleet Gateway Online' : 'Connecting...'}</span>
          </div>
        )}

        {/* User Role Tag */}
        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="hidden md:block text-left max-w-[130px] lg:max-w-[180px]">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block leading-tight truncate">
              {user?.name}
            </span>
            <span className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold block truncate">
              {user?.role}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

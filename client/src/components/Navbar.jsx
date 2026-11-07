import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Radio, Bell, Shield, Sparkles } from 'lucide-react';

const Navbar = ({ title, subtitle }) => {
  const { user } = useContext(AuthContext);

  return (
    <header className="h-16 px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* System Status */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>System Online</span>
        </div>

        {/* User Role Tag */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="hidden md:block text-left">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block leading-tight">
              {user?.name}
            </span>
            <span className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold block">
              {user?.role}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;


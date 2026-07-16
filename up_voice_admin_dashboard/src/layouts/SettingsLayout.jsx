import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const SETTINGS_NAV = [
  { to: '/admin/settings/master', label: 'Master Data (Buildings, Categories)' },
  { to: '/admin/settings/ai', label: 'AI & System' },
  { to: '/admin/settings/security', label: 'Security & Logs' },
];

export default function SettingsLayout() {
  return (
    <div className="p-6 md:p-8 w-full max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-[#2B164D] mb-6">Settings</h1>
      
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left inner sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <nav className="flex flex-col gap-1">
            {SETTINGS_NAV.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => 
                  `px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-slate-100 text-[#2B164D] font-bold shadow-sm border border-slate-200' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-[#2B164D]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main settings content */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 p-6 min-h-[500px]">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

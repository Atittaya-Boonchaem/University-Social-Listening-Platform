
import { NavLink, Outlet } from 'react-router-dom';

const SETTINGS_NAV = [
  { to: '/admin/settings/master-data', label: '🏢 Master Data' },
  { to: '/admin/settings/ai-system', label: '🧠 AI & System' },
  { to: '/admin/settings/security-logs', label: '🛡️ Security & Logs' },
];

export default function SettingsLayout() {
  return (
    <div className="p-6 md:p-8 w-full max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2B164D]">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage system configurations and administrative settings.</p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Left inner sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <nav className="flex flex-col gap-1">
            {SETTINGS_NAV.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => 
                  `px-4 py-3 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-3 ${
                    isActive 
                      ? 'bg-slate-100 text-[#2B164D] font-bold shadow-sm ring-1 ring-slate-200' 
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
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 p-6 min-h-[500px] w-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

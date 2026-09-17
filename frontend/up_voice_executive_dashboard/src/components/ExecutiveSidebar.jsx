import React from 'react';
import { LayoutDashboard, FileText, LogOut, ShieldCheck } from 'lucide-react';

export default function ExecutiveSidebar({ activeTab = 'overview', setActiveTab, user, onLogout }) {
  const menuItems = [
    { id: 'overview', label: 'ภาพรวมระบบ', icon: LayoutDashboard },
    { id: 'reports', label: 'รายงานผู้บริหาร', icon: FileText },
  ];

  return (
    <aside className="w-64 bg-[#23083e] text-white flex flex-col justify-between shrink-0 shadow-2xl z-30 select-none min-h-screen">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 px-6 py-6 border-b border-purple-900/40">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-900/50">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
              UP Connect
            </div>
            <span className="text-[11px] font-medium text-purple-300/80 bg-purple-900/60 px-2 py-0.5 rounded-full">
              Executive View
            </span>
          </div>
        </div>

        {/* Executive Navigation: Only 2 focused options */}
        <div className="px-6 pt-5 pb-2 text-[11px] font-bold tracking-wider text-purple-400/70 uppercase">
          เมนูผู้บริหาร
        </div>
        <nav className="px-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#50137f] text-white shadow-lg shadow-purple-950/60 font-semibold ring-1 ring-purple-400/30'
                    : 'text-purple-200/75 hover:bg-[#340f58] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-purple-200' : 'text-purple-300/70'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-300"></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile Box */}
      <div className="p-4 border-t border-purple-900/40">
        <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-950/50 border border-purple-800/30">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-purple-700/60 flex items-center justify-center border border-purple-400/30 text-white font-bold text-sm shrink-0">
              {user?.name ? user.name.charAt(0) : 'ผ'}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-semibold text-white truncate">
                {user?.name || 'ผู้บริหารระดับสูง'}
              </div>
              <div className="text-xs text-purple-300/70 flex items-center gap-1 truncate">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="truncate">{user?.roleLabel || 'ผู้บริหาร ม.พะเยา'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="ออกจากระบบ"
            className="p-2 text-purple-300/70 hover:text-rose-300 hover:bg-rose-900/20 rounded-xl transition-colors ml-1 shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

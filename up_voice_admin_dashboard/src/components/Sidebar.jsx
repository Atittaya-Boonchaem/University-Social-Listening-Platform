import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, FileText, Settings } from 'lucide-react';

const Sidebar = () => {
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  let roleId = null;
  let role = null;
  try {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      roleId = payload.role_id;
      role = payload.role;
    }
  } catch (e) {}

  const canViewUsers = [1, 3, 4].includes(Number(roleId)) || ['super_admin', 'category_admin'].includes(role);
  const isSuperAdmin = Number(roleId) === 4 || role === 'super_admin';

  const overviewItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/problems', icon: FileText, label: 'Manage Problems' },
    { to: '/admin/users', icon: Users, label: 'Users' },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-100 h-screen flex flex-col fixed left-0 top-0 shadow-sm z-30">
      <div className="p-6 border-b border-slate-50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#2B164D] flex items-center justify-center text-white">
          🎓
        </div>
        <div>
          <h1 className="text-[15px] font-bold text-[#2B164D] leading-tight"><span className="font-bold">UP</span> Connect</h1>
          <p className="text-[11px] text-slate-400 leading-tight">Admin Console</p>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="mb-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Daily Operations</p>
          <div className="space-y-1">
            {overviewItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-[#2B164D]'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-[#2B164D]'
                  }`
                }
              >
                <item.icon size={18} className="flex-shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Flexible Spacer */}
      <div className="flex-1"></div>

      <div className="px-4 pb-4">
        <hr className="border-slate-100 mb-4" />
        <NavLink
          to="/admin/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 w-full text-left text-[13px] font-medium rounded-lg transition-colors ${
              isActive
                ? 'bg-slate-100 text-[#2B164D]'
                : 'text-slate-500 hover:bg-slate-50 hover:text-[#2B164D]'
            }`
          }
        >
          <Settings size={18} />
          Settings
        </NavLink>
      </div>

      <div className="p-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full text-left text-sm font-medium text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
